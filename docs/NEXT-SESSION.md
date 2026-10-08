# Next session: run C0 (cloud preflight), in the cloud

From now on, the M0 plan runs in a Claude Code cloud environment (decision D16 in [plans/M0.md](plans/M0.md)). The tasks that still happen on your PC or on GitHub are in the plan's §4a. C0 is the first cloud session: it checks the cloud environment the way T00 checked Windows. T02 comes after it.

## Before you start

1. **Merge the PR that added this text**, so the cloud session's `main` has the new plan. A cloud session clones the repo from GitHub, so it only sees what's merged or pushed.
2. **Set up the cloud once**, as in [CLOUD.md](CLOUD.md), "Set up once": give the cloud access to the repo, then create the environment `shopblok-starter` with the network access, environment variables and setup script given there.
3. **Start a cloud session** in that environment, on `stephanos221/shopblok-starter` and the branch `main`: on claude.ai/code, or in the desktop app's Code tab with the environment picked in the prompt box.
4. **Nothing to install on your PC for C0.** W0 (turning Corepack off) is only needed before W1, which comes after T05.

## Prompt

Paste this into the cloud session:

```text
Run task C0 (cloud preflight) from docs/plans/M0.md. Don't start T02.

This is a Claude Code cloud session. Read docs/CLOUD.md first. Then read docs/plans/M0.md: §1 (decisions D1, D15 and D16), §2, §3, §4a and the C0 section; and the "Workspace config (T01)" section of docs/SETUP.md. Your auto memory doesn't carry over to my PC or to the next session, so put everything a later session needs into SETUP.md, the plan or the PR.

Work on a new branch. Run every step of C0 and keep each command's key output. If a setup-script step or an allowed domain needs fixing, change docs/CLOUD.md on the same branch. Update docs/NEXT-SESSION.md with the T02 prompt below, changed if C0's results call for it.

Commit, push, and open the PR with `gh api` (REST; `gh pr` doesn't work here). In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T02 can start in the cloud, whether I have to paste a new setup script or add a domain to the environment, and what changed in the plan if anything did.
```

## The T02 prompt, for after C0

C0's PR moves this into the "Prompt" section above, changed if C0 calls for it.

```text
Run task T02 (`packages/config`: TypeScript, ESLint and Prettier presets) from docs/plans/M0.md. Don't start T03.

This is a Claude Code cloud session. Do the steps in docs/CLOUD.md, "What every cloud session does first". Read docs/plans/M0.md: §1 (decisions D3, D5, D6 and D16), §2, §4a and the T02 section; and the "Workspace config (T01)" and "Cloud preflight (C0)" sections of docs/SETUP.md. Run the doctor script as `pnpm run doctor`, never `pnpm doctor`. Your auto memory doesn't carry over, so put everything a later session needs into SETUP.md, the plan or the PR.

Work on a new branch. Create the files T02 lists, with every version pinned exactly. Check each ESLint, typescript-eslint, eslint-config-next and Prettier version against the npm registry before pinning it, and decide any new `allowBuilds` entry that `pnpm install` asks for.

Run every check in T02's Verify list and keep each command's key output. Update docs/NEXT-SESSION.md with the prompt for T03.

Commit, push, and open the PR with `gh api` (REST). In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T03 can start, and what changed in the plan if anything did.
```

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- Your own tasks (W0–W2 on your PC, G1–G4 on GitHub) are in the plan's §4a.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see CLOUD.md).
