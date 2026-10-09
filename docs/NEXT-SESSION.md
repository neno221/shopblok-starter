# Next session: run T04 (local infrastructure), in the cloud

The M0 plan runs in a Claude Code cloud environment (decision D16 in [plans/M0.md](plans/M0.md)). T03, the package stubs and workspace checks, is done: the five packages and `@shopblok/scripts` exist, and `pnpm -r typecheck`, the Vitest run and `pnpm check:workspace` pass ([SETUP.md](SETUP.md#package-stubs-and-workspace-checks-t03)). The setup script's step 6 ran and both folders exist ([SETUP.md](SETUP.md#follow-up-checks-t03)). The tasks that still happen on your PC or on GitHub are in the plan's §4a.

## Before you start

1. **Merge the T03 PR** (G2), so the cloud session's `main` has the packages. A cloud session clones the repo from GitHub, so it only sees what's merged or pushed.
2. **Leave the environment as it is until this session has started.** Don't paste a new setup script and don't change the allowed domains: either one makes the environment rebuild, and then the session can't tell whether the saved copy of the last run is reused. That is the first thing T04's session measures. (T03's PR doesn't change the script, so there is nothing to paste.)
3. **Start a cloud session** in the environment `shopblok-starter`, on `stephanos221/shopblok-starter` and the branch `main`: on claude.ai/code, or in the desktop app's Code tab with the environment picked in the prompt box.
4. **Nothing to install on your PC for T04.** W0 (turning Corepack off) is only needed before W1, which comes after T05.

Two things T03 turned up, neither of which blocks T04:
- **One line in `turbo.json`.** `test` now depends on `transit`, as `typecheck` and `lint` do. Without it, a package's tests stayed a cache hit after a package it depends on changed (SETUP.md, T03 item 4). It is outside T03's file list; revert it if you disagree.
- **`mailpit.axllent.org` isn't on the allowed domains**, so a session can't read Mailpit's docs site (Docker Hub's pages and `docs.docker.com` work). The image's own `--help` covers what T04 needs, so I left the list alone: changing it would hide the setup-cache comparison. Add the domain after T04's session if you want it.

## Prompt

Paste this into the cloud session:

```text
First read docs/NEXT-SESSION.md, which the previous session wrote for you.

Run task T04 (local infrastructure) from docs/plans/M0.md. Don't start T05.

This is a Claude Code cloud session. Do the steps in docs/CLOUD.md, "What every cloud session does first", including step 3 (start Docker): T04 is the first task that needs it. Read docs/plans/M0.md: §1 (decisions D11, D15 and D16), §2 (the Docker images), §4a and the T04 section; and the "Cloud preflight (C0)" and "Package stubs and workspace checks (T03)" sections of docs/SETUP.md, especially C0 items 1 and 4 (Docker) and T03's "What should change in the plan" item 7. Run the doctor script as `pnpm run doctor`, never `pnpm doctor` (it doesn't exist until T14, so expect it to fail). Run ESLint, Prettier, tsc and Playwright through `pnpm exec`, never as the bare command (step 1 of "What every cloud session does first"). The root has no `eslint`, so run ESLint from a package that declares it: `pnpm --filter @shopblok/<name> exec eslint …`, and check `--version` prints 9.39.5 (the image's global one is 10.1.0). Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Before the T04 work, and before you start Docker, take the setup-cache measurement. Don't fix anything this turns up; record the output in a "Follow-up checks (T04)" list in SETUP.md, right after "Follow-up checks (T03)" and before "Config presets (T02)", and say in the PR whether each check passed.
1. Run `date -u`, then `grep -E 'setup (start|end)' /var/log/shopblok-setup.log` and `grep -c 'setup start' /var/log/shopblok-setup.log`. T03's session ran the script from 2026-10-09T03:03:13Z to 03:03:53Z (40 s) and started about a minute later. The log is appended to, so:
   - if the saved copy was reused, the log still holds T03's lines (`setup start 2026-10-09T03:03:13Z`), long before `date -u`;
   - if it was not, the log holds one run only, a minute or so before `date -u`, as in "Follow-up checks (T02)" item 1 and "Follow-up checks (T03)" item 4;
   - if the owner changed the script or the allowed domains since T03's session, the environment was rebuilt and the comparison says nothing. Say so.
   Say which of the three it is, with the numbers.
2. Step 6's folders are still there either way: `ls /opt/dtc-starter/apps/backend/package.json` and `ls /opt/payload-templates` (exactly `blank`, `ecommerce` and `with-postgres`). If one is missing, use `grep 'step 6' /var/log/shopblok-setup.log` as CLOUD.md says and report; don't download anything.
3. `docker info` before you start the daemon: it should fail with `failed to connect to the docker API`. Then start it as CLOUD.md says, note how long it took, and check `docker image ls` lists the four pinned images.

Work on a new branch. Create the files T04 lists. Pin every image tag exactly (the plan's §2 and T04). Mailpit's docs site isn't reachable from the cloud: read its Docker Hub page and `docker run --rm axllent/mailpit:v1.31.4 --help` instead (T03 checked that `readyz` exists). Run the port-clash test as T04 describes it, and stop the image's PostgreSQL and Redis and the listener on 7700 afterwards.

Run every check in T04's Verify list and keep each command's key output. Update docs/NEXT-SESSION.md with the prompt for T05; T05 copies from /opt/dtc-starter, so its prompt must say to check that folder first.

Commit, push (early, and again after each finished step), and open the PR with `gh api` (REST). In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T05 can start, and what changed in the plan if anything did.
```

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- Your own tasks (W0–W2 on your PC, G1–G4 on GitHub) are in the plan's §4a.
- One decision is waiting for you, and it doesn't block T04: **Prettier isn't wired to the repo root yet.** Do you want a root config, a `format:check` script and a CI step? T15 carries the question ([SETUP.md](SETUP.md#config-presets-t02), item 6).
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see CLOUD.md).
- Every cloud session starts with Docker off. T04 is the first task that starts it, as CLOUD.md says.
