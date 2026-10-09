# Shopblok Starter

A brand-neutral storefront starter: **Medusa v2** (commerce) + **Next.js 16** with embedded **Payload CMS 3** (content), built on an atomic design system (shadcn/ui + Tailwind v4).

**Status:** M0 in progress. T00 and T01 ran on Windows; C0 and the rest of M0 run in a Claude Code cloud environment.

- Spec: [docs/SPEC.md](docs/SPEC.md)
- M0 plan: [docs/plans/M0.md](docs/plans/M0.md) (§4a lists what runs in the cloud and what you do on your PC)
- Cloud environment: [docs/CLOUD.md](docs/CLOUD.md)
- Windows preflight (T00): passed, see [docs/SETUP.md](docs/SETUP.md)
- Workspace config (T01): passed, see [docs/SETUP.md](docs/SETUP.md#workspace-config-t01)
- Cloud preflight (C0): passed, see [docs/SETUP.md](docs/SETUP.md#cloud-preflight-c0)
- Config presets (T02): passed, see [docs/SETUP.md](docs/SETUP.md#config-presets-t02)
- Package stubs and workspace checks (T03): passed, see [docs/SETUP.md](docs/SETUP.md#package-stubs-and-workspace-checks-t03)
- Local infrastructure (T04): passed, see [docs/SETUP.md](docs/SETUP.md#local-infrastructure-t04); start it with `pnpm infra:up` ([infra/README.md](infra/README.md))
- Backend from dtc-starter (T05): passed, see [docs/SETUP.md](docs/SETUP.md#backend-from-dtc-starter-t05); `apps/backend` is a copy, and [apps/backend/UPSTREAM.md](apps/backend/UPSTREAM.md) lists every change
- Backend config (T06): passed, see [docs/SETUP.md](docs/SETUP.md#backend-config-modules-switched-on-by-env-t06); the backend registers translation and the local notification provider always, and Redis (event bus, workflow engine, locking, sessions) when `REDIS_URL` is set
- Next step: [docs/NEXT-SESSION.md](docs/NEXT-SESSION.md) (run T07, in the cloud)

Design tokens are based on the "shadcn/ui – Design System by ReUI" Figma community file, licensed CC BY 4.0.
