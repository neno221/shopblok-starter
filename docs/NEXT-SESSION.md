# Next session: write the M0 plan

Paste this prompt into a new Claude Code session opened on this repo:

```text
Write the implementation plan for milestone M0 of Shopblok Starter. Don't execute it yet.

Read docs/SPEC.md first (M0 is defined in §17.1). Load the skills
/medusa-dev:building-with-medusa, /medusa-dev:building-storefronts and
/ecommerce-storefront:storefront-best-practices, and check versions and APIs against
the current official docs (Medusa, Next.js, Payload).

Save the plan as docs/plans/M0.md with:
- ordered tasks, each listing the files/packages it touches, the skill references to
  load, and how it's verified (commands or tests)
- the three spikes (Cache Components × Payload admin, per-locale search indexing,
  Payload locale preloading with filterAvailableLocales), each with a pass/fail test
  and a fallback
- exit criteria (keyless docker compose up → pnpm bootstrap → pnpm dev works)
- out of scope

The repo is also developed locally on an exFAT drive, so the root .npmrc needs
node-linker=hoisted before the first install.
Stop after writing the plan so I can review it, then commit it on a branch and open a PR.
```

## Notes

- The skills named above come from the Medusa Claude Code plugins (`medusa-dev`, `ecommerce-storefront`). If the cloud session doesn't have them, the prompt still works, but install the plugins for best results.
- Medusa's docs MCP server is at `https://docs.medusajs.com/mcp`.
