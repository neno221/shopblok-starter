# Next session: run T02 (config presets), in the cloud

The M0 plan runs in a Claude Code cloud environment (decision D16 in [plans/M0.md](plans/M0.md)). C0, the cloud preflight, is done: T02 can start in the cloud on the environment as it is ([SETUP.md](SETUP.md#cloud-preflight-c0)). The tasks that still happen on your PC or on GitHub are in the plan's §4a.

## Before you start

1. **Merge the PR that added this text** (G2), so the cloud session's `main` has C0's results and the new CLOUD.md. A cloud session clones the repo from GitHub, so it only sees what's merged or pushed.
2. **Paste the new setup script (G4).** C0 added a step 6 to the script in [CLOUD.md](CLOUD.md), "Setup script": it downloads dtc-starter and Payload's templates, which a running session can't do (T05 and T09 need them). T02 doesn't need them, so you can wait until before T05, but pasting now lets T02's session check that step 6 worked. In the environment (gear icon, then **Setup script**), replace the script with the one in CLOUD.md. Nothing else in the environment changes: the allowed domains, variables and name stay as they are.
3. **Start a cloud session** in the environment `shopblok-starter`, on `stephanos221/shopblok-starter` and the branch `main`: on claude.ai/code, or in the desktop app's Code tab with the environment picked in the prompt box.
4. **Nothing to install on your PC for T02.** W0 (turning Corepack off) is only needed before W1, which comes after T05.

## Prompt

Paste this into the cloud session:

```text
Run task T02 (`packages/config`: TypeScript, ESLint and Prettier presets) from docs/plans/M0.md. Don't start T03.

This is a Claude Code cloud session. Do the steps in docs/CLOUD.md, "What every cloud session does first". Read docs/plans/M0.md: §1 (decisions D3, D5, D6 and D16), §2, §4a and the T02 section; and the "Workspace config (T01)" and "Cloud preflight (C0)" sections of docs/SETUP.md. Run the doctor script as `pnpm run doctor`, never `pnpm doctor`. Run ESLint, Prettier, tsc and Playwright as `pnpm exec …`, never the bare command: the image has older global copies on PATH. Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Before the T02 work, run two checks that C0 couldn't. Don't fix anything they turn up; record the output in a "Follow-up checks (T02)" list at the end of SETUP.md's C0 section, and say in the PR whether they passed.
1. Setup cache: `grep -E 'setup (start|end)' /var/log/shopblok-setup.log` and `date -u`. A `setup start` hours before this session means the saved environment was reused. A `setup start` a few minutes before it means the script just ran (for example because I pasted the new one).
2. Setup script step 6: `ls /opt/dtc-starter/apps/backend/package.json` and `ls /opt/payload-templates`. It should list `blank`, `ecommerce` and `with-postgres`. If they are missing, I haven't pasted the new script yet; say so.

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
