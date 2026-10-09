# Next session: run T06 (backend config: modules switched on by env), in the cloud

The M0 plan runs in a Claude Code cloud environment (decision D16 in [plans/M0.md](plans/M0.md)). T05, the backend from dtc-starter, is done: `apps/backend` builds, lints, migrates and boots, and its admin login loads ([SETUP.md](SETUP.md#backend-from-dtc-starter-t05)). `apps/backend/UPSTREAM.md` records the commit and every local change. The setup-cache comparison was taken again: the saved copy of the setup run **was reused a second time**, and the log was the very same file as in T04's session ([SETUP.md](SETUP.md#follow-up-checks-t05)). The tasks that still happen on your PC or on GitHub are in the plan's §4a.

## Before you start

1. **Merge the T05 PR** (G2), so the cloud session's `main` has `apps/backend`. A cloud session clones the repo from GitHub, so it only sees what's merged or pushed.
2. **Decide whether to change the environment before T06.** Adding `mailpit.axllent.org` to the allowed domains is still optional: nothing needed it. Any change to the script or the domains rebuilds the saved copy, and the next session then runs the setup script itself.
   - **If you change nothing,** T06's session repeats the measurement (it is in the prompt) and gives a third data point: T02's session saw the copy not reused, T04's and T05's saw it reused.
   - **If you change something,** add this line to the top of the prompt, so the session doesn't read a fresh log as "not reused": `The environment was rebuilt on purpose before this session: skip the setup-cache measurement.`
3. **Start a cloud session** in the environment `shopblok-starter`, on `stephanos221/shopblok-starter` and the branch `main`: on claude.ai/code, or in the desktop app's Code tab with the environment picked in the prompt box.
4. **W1 can run now** (the Windows backend check, and the real port-clash test), any time after the T05 PR is merged. It doesn't block T06. W0 (turning Corepack off) comes first, [plans/M0.md](plans/M0.md) §4a. T06 needs nothing on your PC.

Three small things for you to decide, none of which blocks T06:
- **The ports are published on all interfaces** (`0.0.0.0:15432` for Postgres, whose password is `postgres`), because W1's Verify expects that output. Binding them to `127.0.0.1` is a one-line edit per port, but it changes W1's expected output. Say if you want it ([SETUP.md](SETUP.md#local-infrastructure-t04), item 5).
- **Prettier isn't wired to the repo root yet.** Do you want a root config, a `format:check` script and a CI step? T15 carries the question ([SETUP.md](SETUP.md#config-presets-t02), item 6). The docs under `docs/` already fail Prettier's check, so it's more than a root config.
- **The backend's dependency ranges.** T05 pinned what the plan lists and left upstream's other carets (`jest`, `@swc/*`, `vite`, …) so diffs against dtc-starter stay small; the lockfile fixes them. Pinning them is a one-time edit if you want it. I would leave them ([SETUP.md](SETUP.md#backend-from-dtc-starter-t05), item 5).

## Prompt

Paste this into the cloud session:

```text
First read docs/NEXT-SESSION.md, which the previous session wrote for you.

Run task T06 (backend config: modules switched on by env) from docs/plans/M0.md. Don't start T07.

This is a Claude Code cloud session. Do the steps in docs/CLOUD.md, "What every cloud session does first", including step 3 (start Docker) and then `pnpm infra:up`: T06's checks boot the backend with Postgres and with Redis. Read docs/plans/M0.md: §1 (decisions D8, D14, D15 and D16), §2, §3 (the BWM skill: its SKILL.md, reference/custom-modules.md and reference/authentication.md are under /opt/medusa-agent-skills/plugins/medusa-dev/skills/building-with-medusa/), §4a and the T06 section; and in docs/SETUP.md: "Backend from dtc-starter (T05)" (all of it: what is in `apps/backend`, and "What should change in the plan", items 3 and 4, which are notes for T06), "Local infrastructure (T04)" (the ports) and "Config presets (T02)", item 5. Also read apps/backend/UPSTREAM.md, and add every change you make to the backend's files to its "Local changes" table. The Medusa docs pages for the Search, Translation, Caching, Redis Event Bus, Redis Workflow Engine and Locking modules are on docs.medusajs.com, which the environment allows (use WebFetch; start from https://docs.medusajs.com/llms.txt to find the URLs). Run the doctor script as `pnpm run doctor`, never `pnpm doctor` (it doesn't exist until T14, so expect it to fail). Run ESLint, Prettier, tsc and Playwright through `pnpm exec`, never as the bare command (step 1 of "What every cloud session does first"). The root has no `eslint`, so run ESLint from a package that declares it: `pnpm --filter @shopblok/backend exec eslint …`, and check `--version` prints 9.39.5 (the image's global one is 10.1.0). Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Before the T06 work, take the setup-cache measurement again. Don't fix anything this turns up; record the output in a "Follow-up checks (T06)" list in SETUP.md, right after "Follow-up checks (T05)", and say in the PR what it showed.
1. Run `date -u`, `uptime -s`, `grep -E 'setup (start|end)' /var/log/shopblok-setup.log`, `grep -c 'setup start' /var/log/shopblok-setup.log` and `stat -c '%n  mtime=%y  birth=%w' /var/log/shopblok-setup.log`. T05's session found `setup start 2026-10-09T03:03:14Z` and `setup end 2026-10-09T03:03:51Z`, one run, 8581 s before its `date -u`, and the log's birth and last-write times were `03:03:14.173130519` and `03:03:51.253129671` ("Follow-up checks (T05)", item 1). So: if that same `setup start` is still there with those two times, the saved copy was reused a third time; if the log holds one run from a minute or so before `date -u`, it was not reused this time; if the owner changed the script or the allowed domains since, the environment was rebuilt and the comparison says nothing (the owner says so at the top of this prompt if they did). Say which it is, with the numbers.
2. Check the folders again as T05 did: `ls /opt/dtc-starter/apps/backend/package.json` and `ls /opt/payload-templates`. T06 doesn't copy from them, so only report if one is missing.

Work on a new branch. T06 adds `apps/backend/medusa-config.ts` changes, `src/config/modules.ts` (a pure `buildModules(env)` plus `has(...keys)`) and `src/config/__tests__/modules.unit.spec.ts`, as the plan's T06 section says. Things T05 found that matter here:
- Upstream's `medusa-config.ts` ignores `REDIS_URL`: with `.env` copied from `.env.example`, the backend logs `redisUrl not found. A fake redis instance will be used`, `Local Event Bus installed` and `Locking module: Using "in-memory" as default`. T06 is what wires Redis in.
- `MEDUSA_FF_TRANSLATION=true` is read, but no translation module is registered yet (the database has `store_locale` and no `translation` or `locale` table). `GET /store/locales` needs a publishable API key, which only T07 creates: the plan's last Verify line says so. Say in SETUP.md how you checked it instead (a throwaway key made through a `medusa exec` script or the admin API is fine, if you don't commit it and don't start T07), or say that you left it for T07.
- The backend has no `test` script, so root `pnpm test` skips it. `pnpm --filter @shopblok/backend test:unit` is what runs the unit tests, and it exits 1 with "No tests found" until your first test exists. Decide whether the backend gets `"test": "pnpm run test:unit"` (so root `pnpm test` runs it) and say so in SETUP.md. `medusa build` is the backend's type check (a type error fails it), and `pnpm --filter @shopblok/backend lint` is `medusa lint`.
- The module entry points the plan names resolve (`@medusajs/medusa/{translation,notification,event-bus-redis,workflow-engine-redis,locking,locking-redis,caching,caching-redis}`); the providers (`notification-local` and so on) were not checked.
- `pnpm install` will only run if you add a dependency; if it stops with `ERR_PNPM_IGNORED_BUILDS`, add only what the error names to `allowBuilds` in pnpm-workspace.yaml and say so in SETUP.md. Installs and builds can take longer than a command may run: start them in the background and wait for them.
- Run the dev server in the background, check it with `curl`, and stop it afterwards. `medusa develop` runs a watcher above the server (`pnpm` → `sh` → `node …/@medusajs/cli`) that stays alive after the server is killed, so stop the server by the PID `lsof -nP -iTCP:9000 -sTCP:LISTEN -t` shows, then the three watcher processes by their own PIDs (find them with `ps -eo pid,ppid,cmd | grep -E 'medusa|pnpm --filter'`), and check nothing is left. Never `pkill -f`.
- `apps/backend/.env` is git-ignored: copy `.env.example` to it first (`cp apps/backend/.env.example apps/backend/.env`). The ports in it are the D15 ones.

Run every check in T06's Verify list and keep each command's key output. Update docs/NEXT-SESSION.md with the prompt for T07.

Commit, push (early, and again after each finished step), and open the PR with `gh api` (REST). In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T07 can start, and what changed in the plan if anything did.
```

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- Your own tasks (W0–W2 on your PC, G1–G4 on GitHub) are in the plan's §4a.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see CLOUD.md).
- Every cloud session starts with Docker off, and the stack's containers don't survive a session. Each one that needs the stack starts Docker and runs `pnpm infra:up` (CLOUD.md, step 3).
