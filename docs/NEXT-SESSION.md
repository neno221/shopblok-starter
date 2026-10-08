# Next session: run T00 (Windows preflight)

T00 checks that pnpm 12, Next.js 16.4, Payload 3.90 and Medusa 2.21 install and build together on your Windows machine before any real code is written. The steps are in [plans/M0.md](plans/M0.md), task T00.

## Before you start

1. **Reformat E: as NTFS** (decision D2). Formatting erases the drive, so:
   1. copy everything off E:;
   2. in File Explorer, right-click E: → Format → File system **NTFS**;
   3. copy everything back, or clone the repo fresh: `git clone https://github.com/stephanos221/shopblok-starter E:\shopblok-starter`.
2. **Install Node.js 22 LTS**, version 22.22 or newer (`node -v`).
3. **Open Claude Code on your computer**, in `E:\shopblok-starter`: the Code tab of the Claude desktop app, or `claude` in a terminal. T00 tests your Windows machine, so it can't run in a cloud session. To follow it from the Claude app on another device, start it with `claude remote-control` instead.
4. **Install the Medusa plugins.** T00 doesn't need them, but T05 onwards does:
   ```text
   /plugin marketplace add medusajs/medusa-agent-skills
   /plugin install medusa-dev@medusa
   /plugin install ecommerce-storefront@medusa
   ```

## Prompt

Paste this into the session:

```text
Run task T00 (Windows preflight) from docs/plans/M0.md. Don't start T01.

Read docs/plans/M0.md first: §1 (decisions D1, D2 and D6), §2 (verified versions) and the T00 section. This session runs on my Windows machine, and E: is now NTFS.

Work in a throwaway folder, E:\shopblok-probe, outside the repo. Don't commit it.
1. Confirm E: is NTFS (`fsutil fsinfo volumeinfo E:`) and Node is 22.22 or newer, then install pnpm 12.10.1 (`npm install -g pnpm@12.10.1`).
2. Build the probe workspace exactly as T00 describes, with every version pinned exactly: pnpm-workspace.yaml from T01, packages/probe, apps/web (next@16.4.0, payload@3.90.2, @payloadcms/ui@3.90.2) and apps/api (@medusajs/medusa@2.21.2).
3. Run every check in T00's Verify list and keep each command's key output.
4. If a check fails, try T00's fallbacks one at a time (pnpm 11.28, then publicHoistPattern for @payloadcms/*) and re-run the checks after each.

Then create docs/SETUP.md with a "Windows preflight (T00)" section: the date, Windows version, Node and pnpm versions, each check as pass or fail with its key output line, any fallback used, and anything in the plan that should change. Commit only that file on a new branch and open a PR.

Stop there. Tell me in plain language whether T01 can start, and what changes if a fallback was needed.
```

## Notes

- Medusa's docs MCP server is at `https://docs.medusajs.com/mcp`.
- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if T00 shows it doesn't hold.
