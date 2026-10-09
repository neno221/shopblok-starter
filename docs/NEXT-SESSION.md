# Next session: run T03 (package stubs and workspace checks), in the cloud

The M0 plan runs in a Claude Code cloud environment (decision D16 in [plans/M0.md](plans/M0.md)). T02, the config presets, is done: `@shopblok/config` exists and its checks pass ([SETUP.md](SETUP.md#config-presets-t02)). The tasks that still happen on your PC or on GitHub are in the plan's §4a.

## Before you start

1. **Merge the T02 PR** (G2), so the cloud session's `main` has `packages/config`. A cloud session clones the repo from GitHub, so it only sees what's merged or pushed.
2. **Paste the new setup script now (G4).** C0 added a step 6 to the script in [CLOUD.md](CLOUD.md), "Setup script": it downloads dtc-starter and Payload's templates, which a running session can't do (T05 and T09 need them). In the environment (gear icon, then **Setup script**), replace the script with the one in CLOUD.md. Nothing else in the environment changes: the allowed domains, variables and name stay as they are. Do this before starting the session, because T03's session checks that step 6 ran. (T02's session found that the saved copy was not reused anyway, so pasting costs nothing extra: SETUP.md, "Follow-up checks (T02)".)
3. **Start a cloud session** in the environment `shopblok-starter`, on `stephanos221/shopblok-starter` and the branch `main`: on claude.ai/code, or in the desktop app's Code tab with the environment picked in the prompt box. Expect the start to take longer than before: step 6 downloads the whole Payload repository.
4. **Nothing to install on your PC for T03.** W0 (turning Corepack off) is only needed before W1, which comes after T05.

## Prompt

Paste this into the cloud session:

```text
First read docs/NEXT-SESSION.md, which the previous session wrote for you.

Run task T03 (package stubs and workspace checks) from docs/plans/M0.md. Don't start T04.

This is a Claude Code cloud session. Do the steps in docs/CLOUD.md, "What every cloud session does first". Read docs/plans/M0.md: §1 (decisions D3, D6 and D16), §2, §4a and the T03 section, including its "Config (from T02)" line; and the "Config presets (T02)" and "Cloud preflight (C0)" sections of docs/SETUP.md, especially T02's "What should change in the plan" item 5. Run the doctor script as `pnpm run doctor`, never `pnpm doctor`. Run ESLint, Prettier, tsc and Playwright through `pnpm exec`, never as the bare command (step 1 of "What every cloud session does first"). The root has no `eslint`, so run ESLint from a package that declares it: `pnpm --filter @shopblok/<name> exec eslint …`, and check `--version` prints 9.39.5 (the image's global one is 10.1.0). Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Before the T03 work, check what the new setup script did. Don't fix anything this turns up; record the output in a "Follow-up checks (T03)" list in SETUP.md, right after "Follow-up checks (T02)" at the end of the C0 section, and say in the PR whether each check passed.
1. Step 6: `grep 'step 6' /var/log/shopblok-setup.log`, `ls /opt/dtc-starter/apps/backend/package.json` and `ls /opt/payload-templates` (it should list exactly `blank`, `ecommerce` and `with-postgres`).
2. How long the script took: `grep -E 'setup (start|end)' /var/log/shopblok-setup.log`. The saved copy is only kept if the script finishes in about five minutes, and step 6 downloads the whole Payload repository, so say whether it did.
3. If a folder is missing, the log says why: no `step 6` lines means the environment still has the old script, and `step 6 FAILED: <dir>` means the download failed. Report which. Don't try to download anything yourself.
4. Also run `date -u` and note how long before the session `setup start` is. The owner pasted the script just before this session, so a recent `setup start` is expected this time and says nothing about caching. The next session (T04) is the first that can show whether the saved copy is reused, so put that comparison (`date -u` against `setup start`, as in "Follow-up checks (T02)" item 1) into the T04 prompt.

Work on a new branch. Create the files T03 lists. Pin every version exactly, and check Vitest and any other new dependency against the npm registry before pinning it (the plan's §2 has Vitest 5.0.3). Every package that lints declares its own `eslint` 9.39.5 and `@shopblok/config`. Decide any new `allowBuilds` entry that `pnpm install` asks for.

Run every check in T03's Verify list and keep each command's key output. Update docs/NEXT-SESSION.md with the prompt for T04.

Commit, push (early, and again after each finished step), and open the PR with `gh api` (REST). In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T04 can start, and what changed in the plan if anything did.
```

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- Your own tasks (W0–W2 on your PC, G1–G4 on GitHub) are in the plan's §4a.
- One decision is waiting for you, and it doesn't block T03:
  - **Prettier isn't wired to the repo root yet.** Do you want a root config, a `format:check` script and a CI step? T15 carries the question ([SETUP.md](SETUP.md#config-presets-t02), item 6).
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see CLOUD.md).
- Every cloud session starts with Docker off. Tasks from T04 on start it as CLOUD.md says; T03 doesn't need it.
