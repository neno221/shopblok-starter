# Next session: run T02 (config presets), in the cloud

The M0 plan runs in a Claude Code cloud environment (decision D16 in [plans/M0.md](plans/M0.md)). C0, the cloud preflight, is done: T02 can start in the cloud on the environment as it is ([SETUP.md](SETUP.md#cloud-preflight-c0)). The tasks that still happen on your PC or on GitHub are in the plan's §4a.

## Before you start

1. **Merge the PR that added this text** (G2), so the cloud session's `main` has C0's results and the new CLOUD.md. A cloud session clones the repo from GitHub, so it only sees what's merged or pushed.
2. **Don't paste the new setup script yet (G4).** C0 added a step 6 to the script in [CLOUD.md](CLOUD.md), "Setup script": it downloads dtc-starter and Payload's templates, which a running session can't do (T05 and T09 need them). T02 doesn't need them. Pasting a changed script rebuilds the environment's saved copy, which would hide the answer to T02's first check (is the saved copy reused?). So paste it after T02 is merged and before T03 starts: in the environment (gear icon, then **Setup script**), replace the script with the one in CLOUD.md. Nothing else in the environment changes: the allowed domains, variables and name stay as they are.
3. **Start a cloud session** in the environment `shopblok-starter`, on `stephanos221/shopblok-starter` and the branch `main`: on claude.ai/code, or in the desktop app's Code tab with the environment picked in the prompt box.
4. **Nothing to install on your PC for T02.** W0 (turning Corepack off) is only needed before W1, which comes after T05.

## Prompt

Paste this into the cloud session:

```text
Run task T02 (`packages/config`: TypeScript, ESLint and Prettier presets) from docs/plans/M0.md. Don't start T03.

This is a Claude Code cloud session. Do the steps in docs/CLOUD.md, "What every cloud session does first". Read docs/plans/M0.md: §1 (decisions D3, D5, D6 and D16), §2, §4a and the T02 section; and the "Workspace config (T01)" and "Cloud preflight (C0)" sections of docs/SETUP.md. Run the doctor script as `pnpm run doctor`, never `pnpm doctor`. Run ESLint, Prettier, tsc and Playwright through `pnpm exec`, never as the bare command: the image has older global copies on PATH, and `pnpm exec` falls through to them for a tool the package doesn't depend on (the root has no `eslint`). Check `--version` against the plan's pin before you trust a result; run ESLint with `pnpm --filter @shopblok/config exec eslint …`. Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Before the T02 work, run two checks that C0 couldn't. Don't fix anything they turn up; record the output in a "Follow-up checks (T02)" list at the end of SETUP.md's C0 section, and say in the PR whether they passed.
1. Setup cache: `grep -E 'setup (start|end)' /var/log/shopblok-setup.log` and `date -u`. A `setup start` hours before this session means the saved environment was reused. A `setup start` a few minutes before it means the script just ran, so the saved copy was not reused; say so. (I haven't pasted the new script, so nothing else should have triggered a rerun.)
2. Setup script step 6 is not checked in this session, because I paste the new script after T02. Instead, in the T03 prompt you write, add the check: `grep 'step 6' /var/log/shopblok-setup.log`, `ls /opt/dtc-starter/apps/backend/package.json` and `ls /opt/payload-templates` (it should list exactly `blank`, `ecommerce` and `with-postgres`), and `grep -E 'setup (start|end)' /var/log/shopblok-setup.log` for how long the script took. If a folder is missing, the log says whether the script is the old one (no `step 6` lines) or the download failed (`step 6 FAILED`).

Work on a new branch. Create the files T02 lists, with every version pinned exactly. Check each ESLint, typescript-eslint, eslint-config-next and Prettier version against the npm registry before pinning it, and decide any new `allowBuilds` entry that `pnpm install` asks for.

Run every check in T02's Verify list and keep each command's key output. Update docs/NEXT-SESSION.md with the prompt for T03.

Commit, push, and open the PR with `gh api` (REST). In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T03 can start, and what changed in the plan if anything did.
```

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- Your own tasks (W0–W2 on your PC, G1–G4 on GitHub) are in the plan's §4a.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see CLOUD.md).
- Every cloud session starts with Docker off. Tasks from T04 on start it as CLOUD.md says; T02 doesn't need it.
