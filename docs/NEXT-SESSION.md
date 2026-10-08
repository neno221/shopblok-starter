# Next session: run T01 (workspace and package-manager config)

T00 passed on 2026-10-08 (see [SETUP.md](SETUP.md#windows-preflight-t00)). T01 creates the root pnpm workspace, `package.json`, `turbo.json` and the other root config files. The steps are in [plans/M0.md](plans/M0.md), task T01.

## Before you start

1. **Make sure Corepack is off.** In a terminal, run `where pnpm`. The first line must be under `%APPDATA%\npm`. If it's under `C:\Program Files\nodejs`, run `corepack disable` from an **administrator** terminal. Otherwise `pnpm -v` fails inside T01's repo, which pins pnpm 12.10.1 (T00 finding).
2. **Check the tools:** `node -v` prints 22.22 or newer, and `pnpm -v` prints `12.10.1`.
3. **Open Claude Code on your computer**, in `E:\shopblok-starter`: the Code tab of the Claude desktop app, or `claude` in a terminal. To follow it from the Claude app on another device, start it with `claude remote-control` instead.
4. **Install the Medusa plugins** if you haven't. T01 doesn't need them, but T05 onwards does:
   ```text
   /plugin marketplace add medusajs/medusa-agent-skills
   /plugin install medusa-dev@medusa
   /plugin install ecommerce-storefront@medusa
   ```

## Prompt

Paste this into the session:

```text
Run task T01 (workspace and package-manager config) from docs/plans/M0.md. Don't start T02.

Read docs/plans/M0.md first: §1 (decisions D1, D3, D5, D6 and D11), §2 (verified versions) and the T01 section. Read the "Windows preflight (T00)" section of docs/SETUP.md too: T01's allowBuilds list and the Corepack note come from it.

Work on a new branch. Create the files T01 lists, with every version pinned exactly as the plan says.

Run every check in T01's Verify list and keep each command's key output.

Commit on the branch and open a PR. In the PR description, give each check's key output line.

Stop there. Tell me in plain language whether T02 can start, and what changed in the plan if anything did.
```

## Notes

- Medusa's docs MCP server is at `https://docs.medusajs.com/mcp`.
- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
