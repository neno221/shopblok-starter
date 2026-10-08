# Next session: run T02 (`packages/config` presets)

T01 passed on 2026-10-08 (see [SETUP.md](SETUP.md#workspace-config-t01)). T02 adds `packages/config`: the TypeScript, ESLint and Prettier presets the apps and packages extend. The steps are in [plans/M0.md](plans/M0.md), task T02.

## Before you start

1. **Turn Corepack off.** This is now required, not optional. In a terminal, run `where pnpm`. The first line must be under `%APPDATA%\npm`. If it's under `C:\Program Files\nodejs`, run `corepack disable` from an **administrator** terminal. The repo now pins pnpm 12.10.1, so with Corepack on, plain `pnpm -v` crashes inside it (`Cannot find module '...\pnpm.cjs'`), as T01 confirmed. Until you do, Claude has to put `%APPDATA%\npm` first on PATH in every command.
2. **Check the tools:** `node -v` prints 22.22 or newer, and `pnpm -v` prints `12.10.1` from inside `E:\shopblok-starter`.
3. **Open Claude Code on your computer**, in `E:\shopblok-starter`: the Code tab of the Claude desktop app, or `claude` in a terminal. To follow it from the Claude app on another device, start it with `claude remote-control` instead.
4. **Install the Medusa plugins** if you haven't. T02 doesn't need them, but T05 onwards does:
   ```text
   /plugin marketplace add medusajs/medusa-agent-skills
   /plugin install medusa-dev@medusa
   /plugin install ecommerce-storefront@medusa
   ```

## Prompt

Paste this into the session:

```text
Run task T02 (`packages/config`: TypeScript, ESLint and Prettier presets) from docs/plans/M0.md. Don't start T03.

Read docs/plans/M0.md first: §1 (decisions D3, D5 and D6), §2 (verified versions) and the T02 section. Read the "Workspace config (T01)" section of docs/SETUP.md too. Run the doctor script as `pnpm run doctor`, never `pnpm doctor`.

Work on a new branch. Create the files T02 lists, with every version pinned exactly. Check each ESLint, typescript-eslint, eslint-config-next and Prettier version against the npm registry before pinning it, and decide any new `allowBuilds` entry that `pnpm install` asks for.

Run every check in T02's Verify list and keep each command's key output.

Commit on the branch and open a PR. In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T03 can start, and what changed in the plan if anything did.
```

## Notes

- Medusa's docs MCP server is at `https://docs.medusajs.com/mcp`.
- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
