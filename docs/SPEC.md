# Shopblok Starter: Medusa × Payload × Next.js

**Spec v0.8** · 2026-10-22 (drafted 2026-10-19; Next 16.4.1 on 2026-10-24) · facts checked against official docs on 2026-10-08, against the M0 build on 2026-10-10, against the M1 build on 2026-10-16 and against the M2 build on 2026-10-19 and 2026-10-22. What changed from v0.7, and why, is in "Changes in v0.8" under the decisions log; v0.7's and v0.6's changes follow it

Status tags:
**[Decided]** agreed · **[Proposed]** a default I picked, confirm or change · **[Risk]** see §17.2

### Decisions log

| Date | Decision |
|---|---|
| 2026-10-08 | **Name:** Shopblok Starter. Repo `shopblok-starter`, packages `@shopblok/*` |
| 2026-10-08 | **Distribution:** agency starter, cloned for each client brand. The source repository is public since 2026-10-22 (for CI's Actions minutes); the clones for clients stay the agency's choice |
| 2026-10-08 | **Blocks:** no ReUI Pro license. Original designs; ReUI's eCommerce blocks are the reference for layout archetypes and component categories (§9.5) |
| 2026-10-08 | **Markets:** multi-region + multi-language. Seeded with CY (Greek), US, GB, DE, FR, CH (de + fr). More countries and languages can be added in settings (§8.5) |
| 2026-10-08 | **URLs:** subfolders on one domain; each segment appears only when needed; optional per-country domains (§8.5) |
| 2026-10-08 | **Primary country:** Cyprus (Greek), served at `/`. English is the base language for authoring and fallback (§8.5) |
| 2026-10-08 | **Translation:** manual only. Medusa's Translation Module has no auto-translation, so no translation tooling |
| 2026-10-08 | **Hosting:** storefront + Payload on Vercel; Medusa backend on Railway |
| 2026-10-08 | **Storage:** Cloudflare R2 everywhere (dev, staging, production). No MinIO. With no keys, it falls back to local disk (§10.7) |
| 2026-10-08 | **CMS data:** Medusa categories and collections are synced into Payload |
| 2026-10-08 | **Payments:** cards with saved cards, Apple Pay, Google Pay, Revolut Pay (§10.1) |
| 2026-10-08 | **Accounts:** email verification required on sign-up |
| 2026-10-08 | **Theme:** light only, no dark mode |
| 2026-10-08 | **Figma:** plan upgraded, MCP access confirmed. The kit uses Inter and a 10 px base radius (§9.1) |
| 2026-10-08 | **Everything else:** defaults accepted (§18) |
| 2026-10-08 | **Tooling:** pnpm 12.10.1 with its normal (isolated) layout and Corepack off; the Windows development drive is NTFS; Next 16.4.0, TypeScript 5.9.3, Medusa 2.21.2 and Payload 3.90.2 are pinned exactly, and Renovate opens the upgrade PRs that CI tests (M0 plan D1 to D6) |
| 2026-10-08 | **Local ports:** the containers publish Postgres on 15432, Redis on 6380 and Meilisearch on 7701, so a machine that runs other local services still starts the stack (D15) |
| 2026-10-09 | **Markets are one place per app:** whoever uses the starter picks regions, currencies and languages once per app, and they work at once, with no code change outside it (D17) |
| 2026-10-10 | **Cache Components stay on** with the embedded Payload admin: production mode is clean, `next dev` logs console errors in the admin (ADR 0001, accepted by the owner) |
| 2026-10-10 | **Search per locale:** one Meilisearch index per locale (M6), one multilingual index on the keyless Postgres default (M3) (ADR 0002) |
| 2026-10-10 | **Payload preloads 42 languages**; the `markets` global decides which the admin offers; locales only grow (ADR 0003) |
| 2026-10-14 | **Design tokens (M1):** the kit's variables are exported by committed read-only plugin code, and Style Dictionary 5.6.1 builds `tokens.css` and `tokens.ts` through `pnpm tokens`, with a contrast gate that overrides the kit where it fails (D24 to D27, D35) |
| 2026-10-14 | **Targets:** every interactive atom is at least 44 × 44 px at every width, on every device (D32) |
| 2026-10-14 | **DS checks:** every atom at 375, 768 and 1440 px in `en` and `el`, in a CI job of its own (D34) |
| 2026-10-14 | **Catalog data in the shell:** the indexable pages read their data in the static shell, and `/next/status` answers 503 for uptime monitors (D36; ADR 0004, accepted 2026-10-16 after S4 passed) |
| 2026-10-15 | **Style:** shadcn's `base-vega`, not `base-nova`. The copy of the kit has no Button to measure, so the owner chose it without a measurement (D29) |
| 2026-10-16 | **The registry is data, and view models are zod schemas (M2):** `@shopblok/registry` lists every DS entry with no React, its prop contracts are zod 4 schemas of view models, and what the DS says about an entry stays in the storefront as a story (D40, D41). Variant counts: Header 6, Footer 5, ProductCard 10 (D46) |
| 2026-10-16 | **Copy is ICU MessageFormat** in a module per locale, passed to a component as a `copy` prop; Greek, German and French are drafted by the sessions and read by the owner in W4 (D43) |
| 2026-10-16 | **Per-visitor parts** are browser-side islands on a `useSyncExternalStore` store whose server snapshot is "unknown"; the DS pages build under `ensureStatic = "navigation"` (D44, ADR 0004) |
| 2026-10-16 | **CI in M2:** a `gate` job decides per PR which of `e2e-smoke`, `design-system` and `windows-smoke` run, failing open (D53) |
| 2026-10-17 | **AddressForm follows Google's address metadata for every country**, from `lib-address` 0.7.0, read at development time and kept as one 20 KB file (D48) |
| 2026-10-19 | **Pixel baselines are English only:** 342 cells and 21 thumbnails, about 48 MB, made only in Playwright's container; the full set of 684 measured 99.9 MiB, over D51's 60 MB line, and the owner chose D51's fallback. The `el` cells keep axe, overflow, size and console (D51) |
| 2026-10-24 | **Next.js 16.4.1:** the pin moves from 16.4.0 for two critical advisories, remote code execution in the image optimiser with SVG files (GHSA-2464-fhr4-w9xw) and in `use cache` functions that return typed arrays (GHSA-673q-mjm6-r5xr), and a high denial of service in the App Router through Server Actions (GHSA-p3m5-59mp-jv5r); `eslint-config-next` moves with it (D4). Approved by the owner after W4 |

### Changes in v0.8

M2 (docs/plans/M2.md) built the registry, the view-model contracts, the copy catalogs, 22 primitives, 40 molecules, 31 organisms and 11 headers and footers (the DS page ends M2 with 122 entries), the pixel baselines and thumbnails, the root-file 404 and the CI gate. v0.8 is v0.7 with what that built and found, and with the decisions the plan set (D40 to D55, 2026-10-16) and the owner's choice of 2026-10-19 (D51's fallback). Each row names the sections it touched, the reason and the evidence (D# = the plan's decisions in §1, "finding #" = the plan's §8, SETUP = docs/SETUP.md, ADR = docs/adr/). Anything not listed is unchanged.

| Sections | Change | Reason | Evidence |
|---|---|---|---|
| Decisions log | Six rows for M2's decisions: the registry and the contracts, ICU copy, per-visitor islands, the CI gate, AddressForm's data, and English-only baselines | D40, D41, D43, D44, D46, D48, D51, D53 | SETUP "The registry (T29)", "View models, copy and fixtures (T30)", "CI for M2 (T27)", "Cart, checkout and account molecules (T34)", "Baselines and thumbnails (T40)" |
| §2 (Principles 5 and 9) | The registry is plain data and the renders live in the storefront; copy is ICU and arrives as a `copy` prop | D40, D43; finding 2 | Payload's CLI and Playwright's loader cannot load a list that imports components (SETUP "The registry (T29)": the registry's sources import only `zod`, and a test reads them) |
| §3 (i18n, UI rows) | i18n is ICU MessageFormat: `intl-messageformat` 11.2.15 in M2, `next-intl` from M3 on the same major; the UI row adds embla-carousel-react 8.6.0, ReUI's `stepper` and `timeline`, and Base UI's Autocomplete, Toast and Drawer, and names what is not used: sonner, cmdk, `next-themes`, a form library | D43, D47, D48; finding 3 | `use-intl` 4.14.9 depends on `intl-messageformat ^11.1.0`, so M3 adds no second copy (plan §2). SETUP "Primitives (T31)", "Discovery and site-wide molecules (T33)" |
| §4 | The layout as built: `packages/ui/src/{primitives,molecules,organisms}/`, `@shopblok/registry` (entries and contracts), `@shopblok/fixtures` typed by those contracts and not by `@medusajs/types`, a module per locale in `@shopblok/i18n`, `src/design-system/stories/` instead of the manifest, `src/lib/visitor/`, `public/registry/`, `e2e/__screenshots__/` and `pnpm thumbnails` | Finding 1; D40 to D43, D52 | SETUP "The registry (T29)", "View models, copy and fixtures (T30)", "Primitives (T31)". §8.2 keeps `@medusajs/types` out of the storefront (a second copy broke `medusa build`), so the fixtures follow the view models |
| §7.3, §7.4, §7.6 | The `header` `design` and a block's `variant` read the registry's options (`variantsOf(family)`) with the registry's thumbnails; there are no separate DS screenshots to pick from | Finding 4; D40, D52 | SETUP "The registry (T29)" (`variantsOf`, `thumbnail`), "Baselines and thumbnails (T40)" (the 21 thumbnails). M4 builds the pickers |
| §8.1, §12 | A root path that looks like a file and that no file or route serves answers a plain-text 404 from `/next/missing-file` before `[market]`; M7's `robots.ts` and `sitemap.ts` are served first because they are file routes | Finding 5; D54 | SETUP "Root files (T28)": the rewrite, `/favicon.ico` still 200, and no `Could not validate` line in `next dev` |
| §8.3 | The per-visitor store (`apps/storefront/src/lib/visitor/`, `useSyncExternalStore`, a server snapshot of "unknown") is how a catalog page reads the cart count, the visitor's cookie choice and the like in the browser; M3 gives it its sources | Finding 6; D44; ADR 0004, reading 2 | SETUP "Navigation and headers (T35)", "Footers and site organisms (T36)": prerendered HTML has no count, and it appears after hydration |
| §8.4 (checkout, forms) | AddressForm orders, labels and requires its fields per country from Google's address metadata, for every country Google lists (252 files, 181 postal patterns), through `lib-address` 0.7.0 (MIT) read at development time into one 20 KB file; forms are plain `<form>`s that post without JavaScript, and M3's server actions validate and return errors. Sub-regions are not kept, and seven countries have no city field, so M3 decides what `Address.city` holds for them | Finding 7; D48 | SETUP "Cart, checkout and account molecules (T34)", "D48: where the address formats come from" (three packages compared on licence, fields, size and publication date) |
| §9.3 | Where each molecule and organism comes from (shadcn and ReUI primitives, Base UI directly, ours on the tokens); the counts as built: 40 molecule entries (30 molecules and ProductCard's ten variants), 31 organism entries and 11 headers and footers, 114 outside Foundations | Finding 8; D42, D46, D47 | SETUP "Product molecules (T32)" to "Cart, checkout and account organisms (T39)"; `packages/registry/src/index.test.ts` counts them |
| §9.4 | The bottom sheet is Base UI's Drawer; the market switcher receives its flags as server-rendered nodes, so `country-flag-icons` stays out of client bundles | Finding 9; D49 | SETUP "Discovery and site-wide molecules (T33)": a test reads the built client chunks for a flag's SVG |
| §9.5 | M2 builds ProductCard's ten variants (named), Header 6 and Footer 5; the template and section variant counts are M3's and M5's | Finding 8; D46 | SETUP "Product molecules (T32)", "Navigation and headers (T35)", "Footers and site organisms (T36)" |
| §9.6 | Entries come from the registry in five groups; overlays are drawn open in a box and checked open from the keyboard; each entry with a contract has a Props table; a `preview` route shows a live render alone; the DS pages build under `ensureStatic = "navigation"`; the clock is fixed and motion is reduced | Finding 10; D40, D44, D45, D50, D52 | SETUP "The registry (T29)", "Primitives (T31)", "Discovery and site-wide molecules (T33)" |
| §13 | The toast and tooltip providers sit at every root; carousels and announcement bars never move by themselves under reduced motion, and rotating content has a pause control; axe, overflow, targets and console run on every entry outside Foundations | Finding 11; D45, D50 | SETUP "Primitives (T31)", "Navigation and headers (T35)", "Listing organisms (T37)" (the carousel never moves by itself) |
| §14 | The `design-system` job runs in Playwright's container, covers every registry entry outside Foundations with `toHaveScreenshot` in `en` and the other checks in `en` and `el`, runs the interaction checks and the DS pages' `dev-console` check; the first job is the `gate`; an `update-baselines` dispatch makes the baselines and thumbnails | Finding 12; D51, D53 | SETUP "CI for M2 (T27)" (the gate on M1's last ten PRs), "Baselines and thumbnails (T40)" (748 of 748 twice, no diff) |
| §14 (visual) | Baselines are committed for `en` only: 342 cells and 21 thumbnails (about 48 MB); not Git LFS; the stop lines are 60 MB, 200 MB of history and half a set in one update | D51; the owner's choice of 2026-10-19 | SETUP "Baselines and thumbnails (T40)", "Size and the stop lines": the full set of 684 measured 99.9 MiB (153 KB a cell on average, against the 30 KB the plan expected) |
| §17.1 | M2's row as built; M3 gains the visitor store's sources and the forms' server actions; M4's `header` and `footer` pickers and blocks' `variant` read `variantsOf()` with its thumbnails | Finding 13 | M2 plan §7 and §8 |
| §19 | Sources for shadcn's CLI page, ReUI's `stepper` and `timeline`, embla, intl-messageformat, the address data, Playwright's snapshot, Docker and clock pages and Next 16.4's rewrites page | Finding 14 | Plan §10 |

### Changes in v0.7

M1 (docs/plans/M1.md) built the design foundations (tokens, the 32 atoms, the DS page, its checks and the dev-console check) and ran spike S4. v0.7 is v0.6 with what that built and found, and with the decisions the plan confirmed (D24 to D39, 2026-10-14). Each row names the sections it touched, the reason, and where the evidence is (D# = the plan's decisions in §1, "finding #" = the plan's §8, ADR = docs/adr/, SETUP = docs/SETUP.md). Anything not listed is unchanged.

| Sections | Change | Why |
|---|---|---|
| Decisions log | Five rows for M1's decisions: the token pipeline, 44 px targets, the DS checks, catalog data in the shell, and the `base-vega` style | D24 to D27, D35, D32, D34, D36, D29 |
| §2 (Principle 7), §13 | 44 × 44 px targets at every width, for every interactive atom; a text link inside a sentence is exempt; shadcn's `xs` and `sm` sizes are dropped from the interactive atoms | D32; finding 9. WCAG 2.5.8's own minimum is 24 px, so 44 is the spec's choice. One size everywhere is simpler to build and to check. SETUP "shadcn and ReUI (T21)" item 6, "DS checks (T24)" item 3 |
| §3 | The UI row names `base-vega` instead of `base-nova`, Base UI 1.9.0 (`@base-ui/react`), shadcn CLI 4.21.4 and shadcn's `cn` package; the `E:\commerce-blocks` line is gone | D29; finding 1; plan §0 item 2 (there is no such scaffold). A style cannot change after initialization. `base-vega`'s Button is 36 px like the classic kit's, `base-nova`'s 32 px. The kit copy has no Button, so the owner chose without a measurement (SETUP "Figma export (T18)" item 5). Registry's `cn`: SETUP "shadcn and ReUI (T21)" item 2 |
| §4 | The layout as built: `packages/ui/tokens/`, `src/styles/`, `src/atoms/`; `src/app/design-system/[locale]/` with its own root layouts and `src/design-system/`; `scripts/figma/` and `scripts/figma-tokens.ts`; `docs/design/kit/`; `src/lib/fonts.ts` | Finding 2; D30, D33. SETUP "Tokens (T19)", "DS page shell (T22)" |
| §8.1 | The DS route is `/design-system/[locale]/…`, static, gated by a build flag, and `design-system` is a reserved first segment; the catalog rows are static shells; a `/next/status` row; the streamed-part paragraph ends with ADR 0004's decision instead of "Decide with the first real catalog page (M1)" | D33, D36; findings 3 and 16; ADR 0004 (accepted 2026-10-16). SETUP "DS page shell (T22)" items 2 to 4, "Backend outage (S4)" |
| §8.3 | On a catalog page and in the layouts above it, per-visitor parts are Client Components that read in the browser; `Suspense` and `'use cache: private'` stay for the dynamic pages; the catalog's `cacheLife` has a long `expire`; `generateStaticParams` reads Medusa with a build stand-in | Finding 16; ADR 0004, readings 2 to 4. `ensureStatic = "navigation"` fails the build on `cookies()` even inside `Suspense` (B3), and a URL idle for longer than `expire` gives one 500 during an outage |
| §9.1 pipeline | The export runs committed, read-only plugin code through the Figma connector; `figma.tokens.json` is the normalised model with every mode; Style Dictionary 5.6.1, driven by `scripts/figma-tokens.ts`, writes the committed `tokens.css` and `tokens.ts`; `shopblok.tokens.json` holds commerce tokens and AA overrides. The kit's weights include 700 and its radius scale reaches `4xl`; the copy draws none of the shadcn atoms | D24 to D27; finding 4. SETUP "Figma export (T18)" (17 identical runs; 1,029 variables, 92 text styles, 14 effect styles), "Tokens (T19)". The connector worked in the cloud, so the export is not tied to a PC |
| §9.1 primitives, §9.3 | Where each atom comes from: shadcn (17), ReUI's `rating` and `number-field` (2), Simple Icons for PaymentIcon, `country-flag-icons` for Flag, and ours on the tokens; the line between ReUI's MIT items and its licensed Pro items | D31; findings 5 and 7. ReUI's licence (updated 2026-09-28); `packages/ui/NOTICE.md`; SETUP "shadcn and ReUI (T21)", "Atoms (T23)" |
| §9.3 | The count stays **32 atoms**, all built; the plan's "33" (and its "16 other atoms") were miscounts | SETUP "Atoms (T23)": 17 shadcn plus 15 others equal the 32 names §9.3 lists |
| §9.2 | One `--radius` with a derived scale; spacing is Tailwind's 4 px step; the 36 contrast pairs (31 text at 4.5:1, 5 UI at 3:1); `border` is decorative; the kit fails the gate in eight places and each override is in `shopblok.tokens.json` | D27, D35; finding 6. SETUP "Tokens (T19)", "Overrides": every override with the kit's value, ours and both ratios |
| §9.6 | The DS page as built: `/design-system/[locale]/…` for `en`, `de`, `fr`, `el`; frames for the viewport iframes; the gate is `DESIGN_SYSTEM_ENABLED` at build time until M7 adds the Payload login; the chrome is in English and the entries in the chosen locale with that locale's market; entries come from a manifest that M2's registry replaces | D33; finding 8. SETUP "DS page shell (T22)" and its review fixes (the flag is frozen into the build) |
| §12 | "Status codes": `ensureStatic = "navigation"`, and a catalog page answers 5xx, not 200, when it cannot be rendered; the 404 and 500 bodies are Next's bare error shell | Finding 16; ADR 0004, readings 1 and 6 |
| §13 | Fonts: `next/font/google` downloads Inter at build time and fails the build without it, so the cloud environment allows `fonts.googleapis.com` and `fonts.gstatic.com`; the gate composites alpha and lists its pairs; shadcn's neutral defaults fail three, and where the kit fails too, the override is ours | D28, D35; findings 10 and 11. SETUP "Styles and fonts (T20)" (`preload: false`: a Greek page loads the Greek file, an English page does not), "Tokens (T19)" |
| §14 | CI is six jobs: the `design-system` job (192 cells) is new, and `e2e-smoke` ends with the `dev-console` step; component tests use Testing Library and happy-dom; screenshots are artifacts and pixel baselines start in M2; from M3, `e2e-smoke` starts Medusa before `pnpm build` | D34, D37, D38; findings 12 and 16; ADR 0004, reading 4. SETUP "DS checks (T24)" (five mutations), "The storefront in next dev (T25)", "shadcn and ReUI (T21)" |
| §15 | `DESIGN_SYSTEM_ENABLED` is read at build time, frozen into the bundle, and listed in turbo's `build` env | D33; finding 13. SETUP "DS page shell (T22)", code-review fix 1: a build without the flag, started with it, answered 200 for DS pages until the value was frozen |
| §17.1 | M1's row as built; M2 gains the pixel baselines and the registry that replaces M1's manifest; M3 gains `/next/status` and the catalog pages built to ADR 0004; M4's CMS pages read in the shell too; M7 gains the DS page's Payload login | Finding 14; ADR 0004, "Consequences" |
| §18 | Q8: the DS page is gated by a build flag until M7 | D33 |
| §19 | Sources for shadcn's monorepo and `components.json` pages and its July 2026 Base UI entry, ReUI's registry and licence, Figma's MCP rate limits and REST variables pages, DTCG 2025.10, Style Dictionary, Simple Icons' disclaimer, WCAG 2.2, and the Next 16.4 pages on fonts, `generateStaticParams` and `ensureStatic` | Finding 15 |

### Changes in v0.6

M0 (docs/plans/M0.md) built the foundation and ran the three spikes. v0.6 is v0.5 with what that found. Each row names the sections it touched, the reason, and where the evidence is (D# = the plan's decisions in §1, "finding #" = the plan's §8, ADR = docs/adr/, SETUP = docs/SETUP.md). Anything not listed is unchanged.

| Sections | Change | Why |
|---|---|---|
| G1, §16 | The keyless start is three commands: `docker compose up -d --wait`, `pnpm bootstrap`, `pnpm dev` | Bootstrap (migrations, seeds, admins, keys) is a step the v0.5 text left out (T13) |
| G7, §8.5 | "Without code" is exact: a currency, region or language is added in one place per app (backend `config/markets.ts`; the storefront's `markets` global), a language Medusa has a locale for needs no migration, and one outside Payload's 42 takes one line and one migration | D17; ADR 0003 |
| §3, §4 | pnpm 12.10.1 with the normal layout; the `node-linker=hoisted` and exFAT notes and the `.npmrc` line are gone; TypeScript 5.9.3; ESLint 9.39.5 | D1, D2, D6, D5; finding 2. pnpm 10 gets security fixes only until 2027-04-30. exFAT had no links, permissions or journal. TS 7 has no JS API until 7.1 |
| §3, §11.1, §17.2 | Next is pinned to 16.4.0 exactly (was "≥ 16.3.6") | D4; finding 1. 16.3.6 fixes GHSA-vcvr-r3jv-pc5j but not the six advisories of 2026-09-30; two apply here (GHSA-3w37-wq28-93x7, GHSA-h694-7cp9-m8p3) |
| §3 | "Why not fork": `nextjs-starter-medusa` is deprecated (README, 2026-04-23); the GitHub archive flag was not checked | finding 12 |
| §5 | Host ports 15432, 6380, 7701, published on all interfaces, with `POSTGRES_PORT`, `REDIS_PORT`, `MEILI_PORT` overrides; the root `compose.yaml` includes `infra/docker-compose.yml` | D15, D21, D11; finding 15. A developer machine often runs other services on 5432, 6379 and 7700, and Payload creates a missing database on connect |
| §5, §7.6, §10.2, §16 | `pnpm run doctor`, never `pnpm doctor`; `--strict` is the all-green check | finding 16. pnpm has a built-in `doctor`, and a built-in wins over a package script |
| §5 | The bootstrap list is as built: eleven steps, idempotent, `--ci`, `--no-demo`; the first Medusa → Payload sync and the Payload content seed arrive in M4 | T13; D7, D9 |
| §6.1 | The Caching Module can run without Redis (`in_memory: { enable: true }`); it is gated on Redis on purpose | finding 5 |
| §6.2 | Seeds run through `medusa exec`, not a migration; `seed-demo-catalog.ts` is development only | D7; finding 3 |
| §6.2, §8.4 | dtc-starter's backend has no email-verification code; M3 adds four pieces | finding 3 |
| §6.2, §8.5, §10.5 | Search: one index per locale and per version on Meilisearch (M6); one multilingual index on the Postgres default (M3); a `/store/search` middleware turns the request's locale into provider options; the Search Module loads every file under `src/search/`, so tests live elsewhere | ADR 0002; finding 6, 17 |
| §6.2, §8.5, §9 | The search index has `min_price_<currency>` for every currency the store sells in (not EUR and USD only) | D17; finding 17 |
| §7.1 | 42 preloaded languages; the admin falls back to the first allowed locale; the filter touches the admin only; locales only grow; saved migrations everywhere; `withPayload`'s headers, `devBundleServerPackages: false`, `turbopack.root`; Payload's three defaults stay on | ADR 0003; findings 7, 8; D9, D18 |
| §7.3 | The `markets` global as built: each language carries its Medusa locale; the proxy reads the map from `/next/markets` | D8, D10; finding 4 |
| §7.7 | `updateTag` and `refresh()` are Server-Action only; hooks use `revalidateTag(tag, 'max')`, wrapped, and skip drafts; Payload's website-template `dynamic`/`revalidate` exports are not copied | ADR 0001; finding 9 |
| §8.1 | Public URLs have no trailing slash (`/us/` is notation); `/cy/` is two hops; `admin`, `api` and `next` are reserved first segments; `x-middleware-rewrite` shows the internal key; a failure in a streamed part cannot change the HTTP status | SETUP T10 item 3, T11 items 3, 6, 7; T12 item 2 |
| §8.2 | `proxy.ts` reads the market map from a cached route, with no Payload in its bundle | D10 (T11: importing Payload cost 550 ms on the first request) |
| §8.3 | Cache Components: "validated by ADR 0001 (kept on)" instead of "by an M0 spike"; the fallback was not taken; the draft rule and the per-language tag note are stated | ADR 0001; finding 10 |
| §8.5 | Store locales are `en-US`, `el-GR`, `de-DE`, `fr-FR`, one per language, stored in `markets`; `[market]` is a `next/root-params` root param read by next-intl; the adding-a-market steps are the ones M0 verified | D8; finding 4, 11 |
| §10 | `SENTRY_AUTH_TOKEN` is optional; the R2 public URL is `S3_PUBLIC_URL` (M6 settles `S3_FILE_URL`); Redis is live in development and a production warning when absent; keys for a provider that is not built yet do not make it live | SETUP T14 item 10 |
| §14 | Backend tests use Jest; CI is five jobs, with compose instead of `services:`; the e2e suites and ADR checks that run in `e2e-smoke` and `backend-integration` | D14; finding 13; ADRs; SETUP T16 |
| §15, §16 | Variables the M0 build added; go-live runs `pnpm bootstrap --no-demo` and ends with `pnpm run doctor --strict`; migrations deploy before code | T13, T14; ADR 0003 |
| §17 | M0 is the foundation as built; M1, M3, M4, M6 and M7 gain the exit items the ADRs name; the risk rows for Cache Components, search and Payload locales say "validated"; new rows for what M0 found | ADRs 0001 to 0003 |
| §19 | Sources added for what the findings cite | finding 14 |

---

## 1. Purpose

A reusable, brand-neutral starter for Medusa storefronts.

- **Commerce** lives in **Medusa v2**: catalog, pricing, regions, cart, checkout, orders, customers, promotions, catalog translations.
- **Content** lives in **Payload CMS 3**: pages, header and footer, marketing sections, media, SEO, UI copy, email copy, and extra content for products, categories and collections.
- **Presentation** comes from an **atomic design system**: shadcn/ui + Tailwind v4 tokens, based on the ReUI shadcn Figma kit. It includes a library of interchangeable header, footer, section and template variants.

Starting a new brand:
1. Clone the starter.
2. Swap the tokens (color, type, radius).
3. Set up markets in settings.
4. Pick header, footer and section variants in Payload.
5. Add API keys as the last step (§16).

### Goals

| # | Goal |
|---|------|
| G1 | Runs end to end locally (`docker compose up -d --wait`, `pnpm bootstrap`, `pnpm dev`) **with no third-party accounts**. Stripe, Resend, PostHog, Sentry and R2 each switch on by adding env vars. |
| G2 | Editors can build the `<main>` of any page, including the homepage, from blocks. They choose each block's data source (Medusa categories, collections or products), upload images, edit copy, preview live and manage SEO. No code needed. |
| G3 | Header and footer designs are chosen from Payload globals. |
| G4 | One design-system reference page lists every token, atom, molecule, organism, section, template and page at 375, 768 and 1440 px. |
| G5 | Secure and SEO-friendly by default, following the official Next.js guidance. |
| G6 | Neutral, monochrome, light-only baseline with no brand styling baked in. |
| G7 | Multi-region and multi-language from v1. New countries, currencies and languages are added in settings, without code (D17): one place per app, and the rest follows (§8.5). Payload preloads 42 languages, so a language Medusa has a locale for needs no migration; one outside them takes one line and one saved migration (ADR 0003). The Postgres search index follows a new language with no restart (ADR 0002). |

### Non-goals (v1)

- Multi-vendor marketplace, B2B (company accounts, quotes), native apps.
- Dark mode. The tokens are semantic, so it can be added later.
- Machine or AI translation.
- Pixel-level copies of paid third-party block libraries (§9.5).
- Infrastructure-as-code. Deployment to Vercel + Railway is documented step by step (§10.8).

---

## 2. Principles

1. **Official first.** Use official Medusa modules and guides and official Payload plugins. Write custom code only where the docs say to build a provider yourself (Resend, Meilisearch, Payload sync, saved payment methods).
2. **Graceful degradation.** Every external service has a local fallback, and switching it on only takes env vars (§10).
3. **Server first.** Data comes from a `server-only` Data Access Layer (DAL) through the Medusa JS SDK, as the Next.js data-security guide recommends. Client JS is used only for interactivity. Never call Medusa with a raw `fetch()`.
4. **Tokens, not values.** Components use semantic tokens only. A brand overrides tokens, not components.
5. **Variants are data.** One registry, plain data with no React (`@shopblok/registry`), drives the Payload select options and thumbnails, the renderer, and the design-system page and its checks. What the DS says about an entry (its story) and how it renders stay in the storefront, keyed by the registry's id (D40).
6. **Presentational sections.** Sections take normalized props from resolvers, so the same UI can render live Medusa data, Payload content or fixtures.
7. **Accessible.** WCAG 2.2 AA, cart and checkout fully keyboard-usable, 44 × 44 px targets at every width for every interactive atom (a text link inside a sentence is exempt, as WCAG 2.5.8 exempts it), `aria-live="polite"` on the cart count, `env(safe-area-inset-bottom)` on sticky mobile CTAs.
8. **No emojis in the UI.** Use Lucide icons or images.
9. **No hard-coded strings or formats.** All copy comes from i18n messages in ICU MessageFormat, and a component takes its strings as a `copy` prop (D43). All money and dates go through `Intl` with the active locale.
10. **Markets are data.** Countries and languages come from settings (Medusa + Payload), never from code constants.

---

## 3. Stack and versions

| Layer | Choice | Version (2026-10-08) | Notes |
|---|---|---|---|
| Runtime | Node 22 LTS | ≥ 22.22 < 25 (`.nvmrc` 22) | Matches dtc-starter `engines`. Payload v4 will need Node ≥ 24.15, so CI runs Node 24 as an informational leg |
| Package manager | **pnpm 12.10.1** + Turborepo **2.11.7** | pinned in `packageManager` | pnpm's normal (isolated) layout; all pnpm settings are in `pnpm-workspace.yaml` (pnpm 12 reads only auth and registry from `.npmrc`). Install it with `npm install -g pnpm@12.10.1` and keep Corepack off: Corepack 0.34 cannot run pnpm 12. The Windows development drive is NTFS (no links, permissions or journal on exFAT). pnpm's `SECURITY.md` still calls its Rust port "not production ready"; M0 installed, built and hot-reloaded on Windows and Linux with it. Fallback: pnpm 11.28 (same settings and lockfile) |
| Language | **TypeScript 5.9.3** | exact | TS 7 has no JS API until 7.1; Medusa's CLI uses `ts-node` and `medusa build` calls `ts.createProgram`; typescript-eslint needs TS below 6.1; Payload's tsconfig uses `baseUrl`, which TS 7 rejects. ESLint is 9.39.5 (end of life since 2026-08-06; the Medusa plugin and `eslint-config-next` stop at 9), Prettier 3.9.9, Vitest 5.0.3, Playwright 1.64.0 |
| Commerce | **Medusa** | **2.21.2** | Backend scaffolded from `medusajs/dtc-starter` `apps/backend` |
| Storefront | **Next.js** | **16.4.1** exactly (React 19.3) | 16.3.6 fixes the critical `next/og` RCE advisory (GHSA-vcvr-r3jv-pc5j) but not the six advisories of 2026-09-30 (fixed in 16.3.8); two apply here, a draft-mode leak through `use cache` deduplication (GHSA-3w37-wq28-93x7) and a cache leak across root-param values (GHSA-h694-7cp9-m8p3). 16.4.0 has every fix. 16.4.1 (2026-10-24) adds the fixes for two critical RCEs, in the image optimiser with SVG files (GHSA-2464-fhr4-w9xw) and in `use cache` functions that return typed arrays (GHSA-673q-mjm6-r5xr), and for a Server Actions denial of service (GHSA-p3m5-59mp-jv5r, high). Renovate opens a PR for each release and CI tests it. Payload's peer range is ≥ 16.3.3 < 17 |
| CMS | **Payload** | **3.90.2** | Embedded in the storefront. Upgrade to v4 once it's stable |
| UI | Tailwind CSS v4, shadcn/ui (Base UI flavour, style `base-vega`), lucide-react, **Inter** | Tailwind 4.3.3, **Base UI 1.9.0** (`@base-ui/react`), shadcn CLI 4.21.4, lucide-react 1.56.0 | `base-vega` rather than `base-nova` (D29): the kit's Button is 36 px, and a style cannot change after initialization. The CLI runs as `pnpm dlx shadcn@4.21.4` and is not a dependency; shadcn's registry now imports its own `cn` package (0.4.0, MIT) instead of `clsx` and `tailwind-merge`. ReUI's free items come from its registry (§9.1). M2 adds embla-carousel-react 8.6.0 (the carousel), ReUI's `stepper` and `timeline`, and Base UI's Autocomplete, Toast and Drawer, and leaves out shadcn's `sonner` (it needs `next-themes`), `command` (cmdk, a second listbox library) and any form library (D47, D48) |
| i18n | ICU MessageFormat: `intl-messageformat` in M2, `next-intl` from M3 on the same major, with messages from Payload; Payload localization; Medusa Translation Module | `intl-messageformat` 11.2.15 (BSD-3-Clause) | §8.5. A module per locale in `@shopblok/i18n` (`src/messages/{en,el,de,fr}.ts`), `formatMessage(message, values, locale)`, cached per locale and message. `use-intl` 4.14.9 (next-intl's runtime) depends on `intl-messageformat ^11.1.0`, so M3 adds no second copy; 12.1.3 is newer and would be one (D43) |
| Data | Postgres 17 | n/a | Medusa's Postgres search provider needs the `pg_trgm` and `unaccent` extensions |
| Cache / queues | Redis 7 | n/a | Medusa event bus, workflow engine, locking, caching, sessions, rate limiting |
| Search | **Medusa Search Module** (v2.21.1+) + custom Meilisearch provider | Meilisearch v1.x | Storefront uses `@medusajs/instantsearch-adapter` + `react-instantsearch` against `/store/search` |
| Object storage | **Cloudflare R2** (S3 API) | n/a | Everywhere. Local disk when no keys are set |
| Email | Resend + react-email | n/a | Medusa custom notification provider; Payload uses `@payloadcms/email-resend` |
| Payments | Stripe, `@medusajs/medusa/payment-stripe` | n/a | Payment Element, automatic payment methods, saved methods |
| Analytics | PostHog | n/a | Medusa Analytics Module (`posthog-node`) + `posthog-js` in the storefront |
| Errors | Sentry | n/a | `@sentry/nextjs`, `@payloadcms/plugin-sentry`, backend via Medusa `registerOtel` |
| Hosting | **Vercel** (storefront + Payload); **Railway** (Medusa server + worker, Postgres, Redis, Meilisearch) | n/a | §10.8 |
| Tests | Vitest (storefront, packages, scripts), Jest through `@medusajs/test-utils` (backend), Playwright, axe-core, Lighthouse CI | n/a | Medusa's test helpers are Jest-only (§14) |

**Why not fork the Next.js starter?**
- `medusajs/nextjs-starter-medusa` was **deprecated in April 2026** (its README says so since 2026-04-23; whether GitHub's "archived" flag is set was not checked). Since Medusa 2.14, `create-medusa-app` generates the **`dtc-starter`** monorepo (`apps/backend` + `apps/storefront`).
- Its storefront still uses Next 15.5 and Tailwind 3. Its UI is not token-driven, and its locale lives in a cookie rather than the URL.
- So we take dtc-starter's **backend and commerce logic** (data layer, checkout, Payment Element, payment-return route, search index, email verification) and build the **storefront UI from scratch**.

---

## 4. Repository layout

```
shopblok-starter/
├─ apps/
│  ├─ backend/                Medusa 2.21 (API :9000, Medusa Admin :9000/app). Based on dtc-starter/apps/backend. Deployed to Railway
│  └─ storefront/             Next.js 16.4 + embedded Payload 3.90 (:8000, Payload admin /admin). Deployed to Vercel. Apps read the shared packages' TypeScript source directly (D3): no build step in `packages/*`
│     ├─ src/app/(payload)/      generated Payload admin + REST (/admin, /api)
│     ├─ src/app/(storefront)/   [market]/… storefront routes (internal; public URLs via proxy rewrite, §8.5)
│     ├─ src/app/design-system/[locale]/  DS reference (§9.6): its own root layouts (overview, entry, frame), not under `[market]`
│     ├─ src/design-system/      `stories/` (one object per registry id: summary, a11y notes, live render, states), the catalog, `interactions.ts` (the overlays the job opens), gate, Foundations pages and components
│     ├─ src/payload/            collections, globals, blocks, fields, hooks, access
│     ├─ src/lib/medusa/         server-only DAL (SDK, cookies, actions)
│     ├─ src/lib/cms/            server-only Payload Local API queries
│     ├─ src/lib/markets/        market resolution, URL builder, hreflang
│     ├─ src/lib/fonts.ts        Inter through `next/font/google` (§13)
│     ├─ src/lib/visitor/        the browser side of per-visitor parts (cart count, cookie choice): a `useSyncExternalStore` store, server snapshot "unknown" (§8.3)
│     ├─ public/registry/        the 21 variant thumbnails, 600 × 400 PNGs, which are also their previews' baselines (§9.6)
│     ├─ e2e/__screenshots__/    the `en` pixel baselines of the DS cells (§14)
│     └─ src/resolvers/          productSource/categorySource → section props
├─ packages/
│  ├─ ui/                     @shopblok/ui: tokens → atoms → molecules → organisms → sections → templates (presentational only)
│  │  ├─ tokens/                 figma.tokens.json (the export, never edited), shopblok.tokens.json (by hand)
│  │  ├─ src/styles/             globals.css, tokens.css (generated and committed), brands/ (documented; no brand ships in M1)
│  │  ├─ src/atoms/              the 32 atoms with their tests; src/lib/utils.ts (`cn`); NOTICE.md holds the third-party notices
│  │  ├─ src/primitives/         the structural shadcn and ReUI items the molecules and organisms are built on (D42, D47)
│  │  ├─ src/molecules/          §9.3's molecules, one file each; ProductCard a folder with one file per variant
│  │  └─ src/organisms/          §9.3's organisms; `header/` and `footer/` hold the variants. Subpath exports, no barrel
│  ├─ registry/               @shopblok/registry: the DS entries as plain data (id, group, kind, label, component reference, family and variant, thumbnail, contract) and the zod 4 contracts of the view models; `variantsOf(family)` for M4's pickers
│  ├─ i18n/                   @shopblok/i18n: default message catalogs (a module per locale: en, de, fr, el, in ICU), `formatMessage` and the other formatters, the address formats
│  ├─ fixtures/               @shopblok/fixtures: mock data typed by the registry's view-model contracts (not by `@medusajs/types`, §8.2), multi-locale
│  ├─ emails/                 @shopblok/emails: react-email layouts (copy comes from Payload)
│  └─ config/                 tsconfig / eslint / prettier presets
├─ infra/docker-compose.yml   postgres, redis, meilisearch, mailpit (local only; no object-storage container)
├─ compose.yaml               includes infra/docker-compose.yml, so plain `docker compose up` works from the root
├─ scripts/                   bootstrap, doctor, check-workspace (M0); figma-tokens.ts (`pnpm tokens`) and figma/ (the export's plugin code and its assembler) (M1); ci-gate.ts (the CI gate) and thumbnails.ts (`pnpm thumbnails`: a Playwright project that writes `apps/storefront/public/registry/`, inside Playwright's container) (M2)
├─ docs/                      SPEC.md, SETUP.md, CLOUD.md, plans/, adr/, design/kit/ (the Figma kit's credit and what its copy draws); DEPLOY.md (Vercel + Railway + R2) and GO-LIVE.md in M7
├─ .github/workflows/ci.yml, renovate.json
├─ pnpm-workspace.yaml        every pnpm setting (no .npmrc: pnpm 12 reads only auth and registry from it)
├─ turbo.json
```

**Payload placement [Decided]:** embedded in the storefront, as the official Medusa × Payload guide does. One Vercel project, Local API with no HTTP hop, same-origin live preview.

---

## 5. Local infrastructure

| Service | Port(s) | Used by | Notes |
|---|---|---|---|
| Postgres 17 | **15432** (container 5432) | Medusa (`medusa` DB), Payload (`payload` DB) | One instance with two databases. Extensions `pg_trgm` and `unaccent` |
| Redis 7 | **6380** (container 6379) | Medusa modules + sessions | Optional in dev (in-memory fallbacks), live after `pnpm bootstrap` |
| Meilisearch v1 | **7701** (container 7700) | Medusa Search provider (M6) | Master key only on the backend. The browser never talks to Meilisearch. Until M6 the search is `search-postgres` |
| Mailpit | 8025 / 1025 | Local inbox for Payload SMTP (optional) | Medusa uses `notification-local` without Resend |
| Object storage | n/a | Medusa files, Payload media | **Local disk** with no keys. A dev **R2** bucket once `S3_*` keys are set (§10.7) |

The host ports are not the standard ones on purpose (D15). A developer machine often runs other local services on 5432, 6379 and 7700, and then `docker compose up` fails, or worse: `postgres://postgres:postgres@localhost:5432/…` reaches the other project's Postgres, which accepts the same login, and Payload **creates a missing database on connect**. 5433 is not used either, because a second PostgreSQL install lands there. The containers keep the standard ports inside; `POSTGRES_PORT`, `REDIS_PORT`, `MEILI_PORT` (and the two Mailpit ports) override the host side. They are published on all interfaces (`0.0.0.0`) for local development (D21); bind them to `127.0.0.1` on a machine others can reach. `pnpm bootstrap` checks that the service on each configured port is this project's own container. `pnpm infra:up`, `infra:down` (keeps the volumes) and `infra:reset` (wipes them) wrap Docker Compose.

**`pnpm bootstrap`** (as built in M0: eleven steps, each ending `done`, `unchanged` or `skipped`; a second run changes nothing; `--ci` for a machine with nobody at it, `--no-demo` to skip the demo catalog)
1. Preflight: Node and pnpm against `engines`, and every service reachable on the port the apps use and owned by this project's compose stack (D15).
2. Creates `apps/backend/.env` and `apps/storefront/.env` from their examples and fills the secrets; it never overwrites a value.
3. Migrates Medusa (`medusa db:migrate`, which also plans a new search-index version when the currencies changed).
4. Seeds Medusa through `medusa exec` scripts, not inside a migration (D7): `seed-markets.ts` in every environment (regions and countries, the store's currencies and locales `en-US`, `el-GR`, `de-DE`, `fr-FR`, tax regions, shipping, all from `config/markets.ts`) and `seed-demo-catalog.ts` in development only (products with translations, categories, collections).
5. Creates the Medusa admin (`DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD` in the backend `.env`).
6. Writes `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` into the storefront `.env` (the one value it replaces when it differs: a wiped database has a new key, and `next build` bakes the key in, so the storefront is built again).
7. Migrates Payload (`payload migrate`; saved migrations everywhere, D9).
8. Creates the Payload admin (the same login as Medusa's), the `integrations` API user, and fills the `markets` global from `@shopblok/fixtures` while it has no country.
9. Writes `PAYLOAD_API_KEY` and `PAYLOAD_SERVER_URL` into the backend `.env`.
10. **M4:** the first Medusa → Payload sync (products, categories, collections, markets) and the Payload content seed (homepage, header and footer, UI strings, email copy, demo media) are skipped in M0.
11. Runs `pnpm run doctor`; an error fails the run, a warning does not.

Applying an edited `config/markets.ts` completely, in the right order, is part of its job (D17).

**`pnpm run doctor`** (never `pnpm doctor`: pnpm has a built-in command of that name, and a built-in wins over a package script) prints which integrations are live and which are on fallback. It also warns about combinations that won't work in production, for example sign-ups that require email verification while Resend isn't configured. It also checks that the backend's `config/markets.ts` and the storefront's market map agree (D17, D19) and, with `--online`, that the running servers accept the keys. `--strict` makes a warning fail: it is the all-green check of the go-live list. The same data drives the Payload status panel (§7.6): `getIntegrationStatus(env)` reports for each integration whether its keys are set (`configured`), whether the code that uses them exists (`wired`, false until M6 builds the provider) and its `state` (`live` or `fallback`), so keys for a provider that is not built do not read as live.

---

## 6. Backend (Medusa 2.21, on Railway)

### 6.1 Module configuration (all env-gated)

| Concern | Provider when keys are present | Fallback with no keys |
|---|---|---|
| Payment | `@medusajs/medusa/payment-stripe` (id `stripe`, so `pp_stripe_stripe`), `automatic_payment_methods: true` | `pp_system_default` (manual), always present |
| Notification (email) | Custom `./src/modules/resend` (official guide) | `@medusajs/medusa/notification-local`, which logs to the console, including verification links. One provider per channel |
| Analytics | `@medusajs/analytics-posthog` (+ `posthog-node`) | `@medusajs/medusa/analytics-local`. Always registered so `track()` never fails |
| File | `@medusajs/medusa/file-s3` → **R2** (`region: "auto"`, R2 endpoint) | `@medusajs/medusa/file-local` |
| Search | `@medusajs/medusa/search` + custom `./src/modules/meilisearch-search` (`default_provider`), from M6 | `@medusajs/medusa/search-postgres`, registered by default. Keys set before M6 do not switch the provider: it does not exist yet |
| Translation | `@medusajs/medusa/translation` + `featureFlags: { translation: true }` | Always on (multi-language is core) |
| Event bus / workflow engine / locking | `event-bus-redis`, `workflow-engine-redis`, `locking` + `locking-redis` | In-memory (dev only) |
| Caching | `@medusajs/medusa/caching` + `@medusajs/caching-redis` (+ `MEDUSA_FF_CACHING=true`) | Unregistered. The module can run without Redis through `in_memory: { enable: true }`; it is gated on Redis on purpose, so a deployment without Redis is visible |
| Sessions | `projectConfig.redisUrl` | In-memory |
| Payload sync | Custom `./src/modules/payload` | Required. `pnpm bootstrap` creates the key locally |
| Errors | `instrumentation.ts` → `registerOtel` + Sentry | Not registered when there's no `SENTRY_DSN` |

Pattern: `medusa-config.ts` builds the `modules` array with a `has(...envKeys)` helper and `.filter(Boolean)`, as the Search Module docs do.

### 6.2 Custom code

**`modules/payload`**: the official guide's REST client, hardened.
- Typed writes with `@payloadcms/sdk`.
- Authenticates as a dedicated Payload `integrations` API-key user, not with the example's insecure `?is_from_medusa` flag.
- Workflows and subscribers with compensation:

  | Medusa source | Payload target |
  |---|---|
  | Products | `products` |
  | Categories | `categories` |
  | Collections | `collections` |
  | Regions, their countries and currencies, and the store's locales | the read-only part of the `markets` global (§8.5) |

- Syncs the default locale only. Catalog translations stay in Medusa.
- Fixes two gaps in the guide: `handle` is synced on create, and thumbnails are synced as a fallback image reference.
- Bulk-sync admin route plus a Settings → Payload page with a sync button.

**`modules/resend`**: Notification provider following the official guide.
- Layouts come from `packages/emails`.
- **Subject and body copy come from Payload's localized `email-templates`** [Proposed], fetched at send time with caching. If Payload is unreachable, built-in English copy is used.
- The locale comes from the order or customer metadata.

| Subscriber (event) | Email |
|---|---|
| `order.placed` | Order confirmation |
| `shipment.created` | Shipped, with tracking |
| `order.canceled` | Cancellation |
| `auth.password_reset` (customer + admin) | Reset link |
| Customer verification (built in M3: dtc-starter's backend has no such code, only its storefront has) | Verify your email |
| `customer.created` (after verification) | Welcome |
| `invite.created` | Admin invite |
| `order.return_requested` / refund | Return and refund updates |

**`modules/meilisearch-search`** (M6): Search Module provider (extends `AbstractSearchProviderService`). Validated by ADR 0002.
- **One index per locale and per version** (`<name>_v<N>__<locale>`). The provider writes one document per locale into the index of the version being filled (`index`, not `definition.physical_name`), creates a locale's index on its first write, takes the locales from the store's `supported_locales`, and selects the index with `search_options.locales` (one locale per query). A locale with no index yet falls back to the default locale's index and logs a warning, never to an empty result. Languages Meilisearch has a hint for get `localizedAttributes`; the others (Mongolian) are tokenised by default and found by their own words.
- Facets: categories, collections, tags, type, option values, per-currency prices (`min_price_<currency>`, `max_`, `original_` and `on_sale_` for **every** currency the store sells in, from `config/markets.ts`, D17), in-stock, on-sale.
- **[Risk]** The Search Module landed in 2.21.1, and there's no official Meilisearch provider. The Medusa behaviours the design rests on are guarded by `search-locale-assumptions.spec.ts`, which CI runs.

**Search on the keyless Postgres default** (M3, ADR 0002):
- One multilingual index (candidate A′): a single `search_text` holds every locale's title, description, category and option text, facets use category ids (the storefront labels them with the categories it already fetches), and the default-language `title` sorts. A new language needs no restart, migration or edit. It does not isolate languages.
- One transform reads each product per locale with `query.graph(…, { locale })`, selecting the ids of categories, options and values (a nested object is translated only when its `id` is selected), and feeds both providers.
- The index follows `translation.created|updated|deleted` events (one event per translation row). A bulk translation change ends with `searchModule.reindex({ index })`.
- A middleware on `POST /store/search` turns `req.locale` into the options of the index behind the entity, so the storefront sends the same request whichever provider is active. It uses `req.locale` only if it is one of the store's `supported_locales`, else the default locale, and overwrites `search_options.locales` instead of honouring the caller's.
- The Search Module loads **every file under `src/search/`** as an index definition, so tests live elsewhere (`src/config/__tests__/`). Adding a currency to a database that exists needs `medusa db:migrate` plus a restart before the index has its price fields; `pnpm bootstrap` does both.

**Saved payment methods** (based on Medusa's official tutorial, adapted to the Payment Element, §10.1)
- `GET /store/customers/me/payment-methods` reads the customer's account holder and calls `listPaymentMethods`. Customer-authenticated, returns only the caller's own methods.
  - The tutorial's middleware matcher doesn't match its route path. Ours is tested.
- `DELETE /store/customers/me/payment-methods/:id` detaches a saved method.
- `initiatePaymentSession` passes `setup_future_usage: "off_session"` when the shopper ticks "Save for next time".

**Revalidation subscribers**
- On product, category, collection, price-list, inventory-level, translation and region/locale changes, POST to the storefront `/api/revalidate` with `REVALIDATE_SECRET`.
- The secret is compared in constant time. The official guide's route doesn't check a secret at all.

**Analytics workflows**: `order_placed`, `customer_created`, `cart_created`, `order_canceled`, all with `market` and `locale`.

**`scripts/enable-stripe-regions.ts`**: idempotent `medusa exec` script.
- Since v2.20, a provider must be enabled on each region before carts can use it, so env vars alone aren't enough.
- Runs in `pnpm bootstrap`, and again when `STRIPE_API_KEY` first appears.

**API middlewares**
- `allowFields(...)` for every link or custom field on the Store API (v2.21 strict allow-list).
- `configureStoreSearch({ allowed_indexes: { product: true } })`.
- `cors()` for custom routes.
- A Redis rate limiter on `/auth/*`, verification and cart completion. Railway has no WAF.

**Optional modules (M8)**
- `reviews`: rating, title, body, verified purchase, moderation in Medusa Admin, aggregate for JSON-LD.
- `wishlist`: customer-scoped; guest wishlist kept in local storage and merged on login.

### 6.3 Production notes (Railway)

- Two services from the same repo:
  - **server**: `MEDUSA_WORKER_MODE=server`, admin at `/app`.
  - **worker**: `MEDUSA_WORKER_MODE=worker`, `DISABLE_MEDUSA_ADMIN=true`.
- Predeploy `medusa db:migrate`. Health check `/health`. At least 2 GB RAM.
- `JWT_SECRET` and `COOKIE_SECRET` are mandatory.
- CORS:
  - `STORE_CORS`: production domain(s), any per-market domains, and a regex for this project's Vercel preview URLs.
  - `AUTH_CORS`: store + admin origins.

---

## 7. CMS (Payload 3.90, on Vercel)

### 7.1 Setup

- Route groups: `src/app/(payload)` holds the generated, unedited Payload files; `src/app/(storefront)` holds the storefront.
- `withPayload(...)` and the `@payload-config` alias. `proxy.ts` excludes `/admin`, `/api`, `/next/*`.
- `postgresAdapter` on the separate `payload` DB.
  - In production: a pooled connection string and a small `pool.max`.
  - **Saved migrations everywhere** (D9): `push` is off unless `PAYLOAD_DB_PUSH=true` (schema experiments only), because `payload migrate` prompts once dev push has touched a database, which would make `pnpm bootstrap` interactive. Every schema change is a reviewed file in git, deployed before the code that needs it.
- **Localization** (ADR 0003)
  - `localization.locales` = a **preloaded list of 42 languages**: the EU's 24, every language Medusa has a locale for (36), and seven more (`apps/storefront/src/payload/locales.ts`). They cost nothing measurable: over 18 request and query measures the full list is 0.91 to 1.06 times a 4-language config, and its initial migration is 16 KB that runs in 129 ms.
  - `defaultLocale: 'en'`, the base language (§8.5), with `fallback: true`.
  - `filterAvailableLocales` shows editors only the locales of the countries enabled in the `markets` global, and always English; it never returns an empty list. Since Payload 3.28 the admin falls back to the first allowed locale if the default is filtered out, so the old crash is gone. The filter follows `markets` with no restart; it shares one read of `markets` for 2 seconds on `globalThis` (Payload calls it three times per admin page, each time with a copy of the request) and a save of `markets` writes its languages into that memo.
  - **The filter touches the admin only.** The REST and Local API serve every preloaded locale whatever `markets` says (they do not even reject an unknown one), so the storefront and access control enforce markets, and a content read takes its locale from the market map, never from the request.
  - **Locales only grow.** A language is switched off in `markets` and never taken out of `locales.ts`: removing one makes `payload migrate:create` write a migration that fails on a database with content, and a Payload that no longer lists a language deletes its rows the next time an ordinary page is saved. `locales.test.ts` fails when the list and the newest migration's `_locales` enum differ.
  - Why preload: Payload's locale list is fixed when the server starts and is a Postgres enum. A language outside the 42 is **one line in `locales.ts` plus one saved migration** (four `ALTER TYPE … ADD VALUE`, 4 ms on a database with content), deployed before the code; the runbook is SETUP.md, "A language outside the list".
- **Payload's own defaults stay on** (D18): its telemetry, the creation of a missing database on connect (development only: production sets `disableCreateDatabase`), and the admin's Gravatar avatar.
- **Generated-file and config notes (M0):**
  - `withPayload` adds `Vary`/`Critical-CH: Sec-CH-Prefers-Color-Scheme`, `Accept-CH` and `X-Powered-By` to **every** route, `poweredByHeader: false` notwithstanding. M7 (CDN caching) strips what matters.
  - `withPayload(…, { devBundleServerPackages: false })`, and `turbopack.root` and `outputFileTracingRoot` at the repository root (the templates point at the app, which is wrong for a monorepo).
  - Windows Sass `loadPaths` only if `custom.scss` imports from `@payloadcms/ui`; neither the `blank` nor the `with-postgres` template has it.
  - A `packageExtensions` entry in `pnpm-workspace.yaml` declares the React peers `@payloadcms/next`, `@payloadcms/ui` and `richtext-lexical` forget, so they resolve the storefront's React 19 and not the Medusa admin's React 18; `pnpm check:workspace` guards it.
- Config essentials:
  - `serverURL` set, which turns on CSRF.
  - `cors` / `csrf` = `[serverURL]`.
  - Secure cookies in production.
  - `graphQL.disable: true`.
  - `upload.limits.fileSize`.
- **Reading content:** the Local API (same process), with React `cache()`, Next cache tags and `locale`. Supports drafts and live preview.
- **Access rule:** every user-scoped Local API call passes `overrideAccess: false` and `user` explicitly. This keeps the code safe when v4 flips the default.

### 7.2 Collections

| Collection | Purpose | Key fields |
|---|---|---|
| `pages` | Every CMS page, including the homepage | `title`ᴸ, `slug`ᴸ, `parent`/`breadcrumbs` (nested-docs), `layout` (blocks), `meta`ᴸ, drafts + autosave + scheduled publish |
| `media` | Uploads to R2 | `alt`ᴸ (**required**), `caption`ᴸ, focal point. Sizes: `thumb`, `card`, `hero`, `og` 1200×630. AVIF/WebP. MIME allow-list, SVG off |
| `products` | Synced from Medusa | Read-only: `medusaId`, `handle`, `title`. CMS fields: `richDescription`ᴸ, `gallery[]`, `sections`, `meta`ᴸ |
| `categories` | **Synced** [Decided] | Read-only: `medusaId`, `handle`, `name`, `parent`. CMS fields: **`image`**, `banner`, `intro`ᴸ, `sections`, `meta`ᴸ |
| `collections` | **Synced** [Decided] | Same pattern as categories |
| `email-templates` | Email copy per template type [Proposed] | `type`, `subject`ᴸ, `preheader`ᴸ, `heading`ᴸ, `body`ᴸ (Lexical with `{{variables}}`), `cta`ᴸ |
| `posts` | Editorial / blog | `title`ᴸ, `slug`ᴸ, `excerpt`ᴸ, `content`ᴸ, `hero`, `author`, `publishedAt`, `meta`ᴸ |
| `forms`, `form-submissions` | Form Builder | Localized labels. Hardened (§11) |
| `redirects` | Redirects plugin | `from`, `to`, `type` (301/302/308) |
| `users` | CMS editors | Roles `admin`, `editor` |
| `integrations` | Machine users | API key only (`disableLocalStrategy`), role `medusa-sync` with write access to synced collections and the synced part of `markets` |

ᴸ = localized field.

M0 ships only `users`, `integrations`, `media`, a `pages` stub (localized title and slug, drafts) and the `markets` global (D12); the rest is M4.

### 7.3 Globals

**`markets`**: the settings page for countries and languages (§8.5). M0 has the editable part; the synced part arrives with M4.
- **Synced from Medusa (read-only):** countries, their regions and currencies, and the store locales.
- **Edited in Payload:**
  - which countries are enabled;
  - each country's languages and default language, and for each language the **Medusa locale** it maps to (D8: one of Medusa's 51 BCP 47 codes, one per language, validated on save);
  - the **primary country** (served at `/`) and the **fallback market** (x-default);
  - an optional domain per country;
  - an optional suggestion-banner message.

**`header`**
- `design`: variant picker with thumbnails (`variantsOf("header")`).
- `announcementBar`ᴸ.
- `navigation.items[]`: `link` | `dropdown` | `megaMenu`. The mega menu source is the category tree or manual entries.
- `utilities`: search, account, wishlist, market switcher; sticky mode.
- `logo`.

**`footer`**
- `design`, `columns[]`, `newsletter`, `social[]`, `legalLinks[]`, `paymentIcons`, `marketSwitcher`, `copyright`ᴸ.

**`site-settings`**
- Store name, logos, icons, **`homepage`**.
- SEO defaults, Organization schema data.
- 404/500 copy, cookie-consent copy, free-shipping message.

**`ui-strings`**: all storefront microcopy, localized [Proposed].
- Seeded from `@shopblok/i18n` for en, el, de and fr, and editable in the admin. Missing keys fall back to English, then to the code catalog.
- This means a language added in settings can be fully translated without code.
- **Note:** this replaces the earlier default of keeping UI strings in code. Adding languages from settings requires it.

**`templates`**: PDP, PLP, cart, checkout, order confirmation and account variants, plus default PDP sections.

All globals have drafts and live preview. Afterwards they call `revalidateTag('global:<slug>:<locale>', 'max')`.

**How the market map is read (D10).** `getMarketMap()` reads the global with the Local API behind a 30 s in-process cache. The layout reads it through a `use cache` function (`global:markets`, `revalidate: 30`), because Cache Components refuse uncached I/O in a prerendered root layout. `proxy.ts` reads it from the public `/next/markets` route (the same `use cache` entry, open countries only), so the proxy bundle has no Payload (importing it cost 550 ms on the first request, over the 150 ms limit). A saved map reaches the proxy in 30 to about 65 s. In development, and while `next build` runs, an empty or unusable global falls back to the seeded `@shopblok/fixtures` map; in production it does not (a build for deployment needs the database). The fetch URL comes from `NEXT_PUBLIC_BASE_URL`, never from the `Host` header.

### 7.4 Blocks (inside `<main>`)

Every block has two common fields:
- `variant`: registry options (`variantsOf(family)`), thumbnails from the registry: 600 × 400 PNGs at `/registry/{id}.png`, made from the DS's `preview` route (§9.6).
- `sectionSettings`: anchor, spacing, surface (`default`/`muted`/`inverse`), container, visibility.

In the block drawer each block shows a thumbnail via `admin.images.thumbnail` (3:2). Text and media are localized. All locales share the same block structure; a page can opt in to a fully localized layout.

| Block | Variants | Content fields | Data source |
|---|---|---|---|
| `hero` | 8 | heading, subheading, eyebrow, media, CTAs[], countdown end | optional `productSource` |
| `categoryShowcase` | 6 | heading, intro, CTA | `categorySource` |
| `productCollection` (grid / carousel) | 8 | heading, intro, CTA | `productSource` |
| `featuredProduct` | 3 | heading, copy, media override | single product |
| `bundle` / cross-sell | 2 | heading, copy | handpicked products (no bundle pricing in v1) |
| `promoBanner` / `coupon` | 6 | heading, copy, **copyable code**, terms, expiry, media | none. Medusa validates codes at cart |
| `testimonials` | 4 | quotes[] | CMS (reviews module in M8) |
| `comparison` | 3 | heading, spec rows | handpicked products + attributes/metadata |
| `richText` | 1 | Lexical | n/a |
| `mediaWithText` | 3 | media, rich text, CTAs, image side | n/a |
| `uspBar` / trust badges | 2 | items[] | n/a |
| `logoCloud` | 2 | logos[] | n/a |
| `faq` | 2 | items[]. Emits `FAQPage` JSON-LD | n/a |
| `newsletter` | 2 | heading, copy | Resend Audiences (env-gated); Payload form submission as the fallback |
| `formBlock` | 1 | form reference | Form Builder |
| `collectionSpotlight` | 2 | media, copy | collection + `productSource` |
| `recentlyViewed` | 1 | heading | local storage |
| `editorialList` | 2 | heading | `posts` |
| `video` | 1 | upload or embed, poster, captions per locale | n/a |
| `spacer` / `divider` | 1 | size | n/a |

### 7.5 Reusable fields

**`link`**
- Internal references (page, category, collection, product, post) or a custom URL.
- `label`ᴸ, `newTab` (adds `rel="noopener noreferrer"`), `appearance`.
- Internal links resolve to the **current market's public URL** at render time.

**`productSource`**
- `mode`: `collection` | `category` (± descendants) | `handpicked` | `newest` | `onSale` | `tag` | `type`
- `limit` (1–24), `sort`, `emptyBehavior`.

**`categorySource`**
- `mode`: `topLevel` | `childrenOf` | `handpicked`
- per-item image and label overrides.

**Resolution rule [Decided]**
- Payload stores references only.
- Prices, stock, currency and translated titles are resolved on the server with the shopper's `region_id` and locale.

### 7.6 Admin UX

- **Variant picker with thumbnails:** a custom `admin.components.Field` on `select` fields, rendering image cards via `useField`.
- **Medusa pickers:** native `relationship` fields to the synced collections.
- **Integrations status panel** (from `pnpm run doctor`'s `getIntegrationStatus`, with its `wired` flag; M6 flips the flags).
- **Locale switcher** limited to the enabled locales, plus a per-document translation-completeness indicator [Proposed].

### 7.7 Preview, drafts, scheduling, revalidation

- **Live preview:** breakpoints 375×667, 768×1024 and 1440×900. The preview URL uses the selected locale's market path. Server-side `RefreshRouteOnSave` with autosave. Rendered only in draft mode.
- **`/next/preview`:** checks `PREVIEW_SECRET`, requires a `payload.auth()` user, uses `getSafeRedirect`, then calls `draft.enable()`. Exit via POST.
- **Drafts:** read access is `user ? true : { _status: { equals: 'published' } }`.
- **Scheduled publish:** Vercel Cron calls `/api/payload-jobs/run` with `CRON_SECRET`.
- **Revalidation:** hooks call `revalidateTag(tag, 'max')`, with tags per locale. Hooks are guarded by `req.context.disableRevalidate`.
  - `updateTag` and `refresh()` work only in Server Actions; a Payload hook runs in its REST route handler, so it uses `revalidateTag(tag, 'max' | { expire: 0 })` (verified under `next start`, ADR 0001). The call is wrapped, because it throws outside a Next request (a Payload script, `payload migrate`).
  - Revalidate when the document is published, when it was published before the save (an unpublish, even over a newer draft: Payload's `previousDoc` is the latest version, not the published row) and when a published document is deleted; never for a draft that was never published (`apps/storefront/src/payload/hooks/revalidate-pages.ts` is the first hook). A failure other than "outside a Next request" is logged as a warning.
  - `'max'` is stale-while-revalidate: the first request after a save may show the old text and starts a refresh of about 300 ms; the next shows the new.
  - Do not copy Payload's website template `dynamic` and `revalidate` exports: they are build errors under Cache Components.

### 7.8 Plugins

| Plugin | Use |
|---|---|
| `@payloadcms/plugin-seo` | **Yes**: localized `meta` on pages, products, categories, collections and posts |
| `@payloadcms/plugin-redirects` | **Yes**: enforced in `proxy.ts` as 301/308 |
| `@payloadcms/plugin-form-builder` | **Yes, hardened**: honeypot, rate limit, optional Turnstile |
| `@payloadcms/plugin-nested-docs` | **Yes**: page hierarchy + BreadcrumbList |
| `@payloadcms/plugin-import-export` | **Yes**: content migration and manual translation round-trips (export, translate offline, import). Admin-only |
| `@payloadcms/plugin-sentry` | **Yes** (when DSN set) |
| `@payloadcms/storage-s3` | **Yes**: R2; `clientUploads: true` on Vercel |
| `@payloadcms/email-resend` | **Yes** (when key set); dev fallback nodemailer → Mailpit |
| `@payloadcms/live-preview-react`, `richtext-lexical`, `@payloadcms/sdk`, `@payloadcms/translations` | **Yes** |
| `@payloadcms/plugin-search`, `plugin-mcp`, `kv-redis` | Optional |
| Translator / auto-translation plugins | **No** (decided) |
| `plugin-multi-tenant`, `plugin-ecommerce`, `plugin-stripe` | **No** |

---

## 8. Storefront (Next.js 16.4, on Vercel)

### 8.1 Route map (public URLs; `{m}` = market prefix, see §8.5)

| Public route | Template | Index | Rendering |
|---|---|---|---|
| `{m}/` | Home (`site-settings.homepage`) | ✓ | static shell (`ensureStatic = "navigation"`), `cached()` with tags; per-visitor parts read in the browser |
| `{m}/[...slug]` | CMS page | ✓ | static shell (`ensureStatic = "navigation"`), `cached()` with tags; per-visitor parts read in the browser |
| `{m}/products/[handle]` | PDP | ✓ | static shell (`ensureStatic = "navigation"`), `cached()` with tags; cart controls are Client Components |
| `{m}/categories/[...handle]` | PLP | ✓ | static shell (`ensureStatic = "navigation"`), `cached()` with tags, first page; facets via search |
| `{m}/collections/[handle]` | PLP | ✓ | same |
| `{m}/store` | PLP (all) | ✓ | same |
| `{m}/journal/[slug]` | Post | ✓ | static shell (`ensureStatic = "navigation"`), `cached()` with tags; per-visitor parts read in the browser |
| `{m}/search` | Results | noindex | dynamic |
| `{m}/cart` | Cart | noindex | dynamic |
| `{m}/checkout` | Checkout (minimal chrome) | noindex | dynamic, nonce CSP |
| `{m}/order/[id]/confirmed` | Receipt | noindex | dynamic |
| `{m}/order/lookup` | Guest order lookup | noindex | dynamic |
| `{m}/account/*` | Dashboard, orders, order detail, addresses, profile, **payment methods**, wishlist, returns | noindex | dynamic |
| `{m}/login`, `/register`, `/verify`, `/forgot-password`, `/reset-password` | Auth | noindex | dynamic |
| `/api/payment-return`, `/api/revalidate` | Route handlers | n/a | n/a |
| `/next/preview`, `/next/exit-preview` | Draft mode | n/a | n/a |
| `/next/markets` | The market map for `proxy.ts` (open countries only) | n/a | prerendered, refreshed every 30 s |
| `/next/status` | Uptime check (built with the first catalog page, M3): 200, or 503 when Medusa's Store API or Payload's database does not answer within 2 s | n/a | dynamic, `no-store` |
| `/next/e2e/*` | Test-only reads for CI (ADR 0001's checks) | n/a | dynamic; **404 unless `E2E_TEST_ROUTES=true`**, which only CI's `e2e-smoke` sets |
| `/admin/*`, `/api/*` | Payload | disallow | n/a |
| `/design-system/[locale]/…` | DS reference (`en`, `de`, `fr`, `el`), and `/design-system/[locale]/frame/…` for the bare render of each viewport iframe (§9.6) | noindex, gated by `DESIGN_SYSTEM_ENABLED` at build time | static |

**Internally**, every storefront route lives under `src/app/(storefront)/[market]/…`, where `market` is a key such as `el-cy`. `proxy.ts` maps clean public URLs to these internal routes with a rewrite, and the link builder does the reverse. Public URLs never show the internal key (the internal `/el-cy` is a 404).

Things M0 measured about these URLs:
- **No trailing slash.** `trailingSlash` is off, so Next redirects `/us/` to `/us`. `/us/`, `/ch/fr/` and `/cy/` in this spec are notation for `/us`, `/ch/fr` and `/cy`; `buildPublicUrl` and the hreflang tags give the slashless form (`/` for the primary market).
- **`/cy/` is two hops**: Next's 308 to `/cy`, then the proxy's 301 to `/`. Setting `skipTrailingSlashRedirect` would make it one but would also stop Next normalising `/admin/` and `/api/…/`, so it stays off.
- **`admin`, `api`, `design-system` and `next` are reserved first segments** (Payload's routes, the DS page, the draft-mode routes, `/next/markets` and `/next/status`). The matcher leaves them and files (a last segment that ends in `.` and a letter) alone, so a CMS page with one of those slugs is not reachable at the primary country's `/…` URL.
- **`x-middleware-rewrite`** is visible on responses in `next start` and tells a visitor the internal key; M7 (headers) can strip it.
- **A not-found URL** is rewritten to `/` (which matches no route), not to `/_not-found`, which `[market]` would take for a market key.
- **Root files answer 404 before `[market]`** (D54). A path of one segment that looks like a file (`/robots.txt`, `/sitemap.xml`, `/apple-touch-icon.png`, `/manifest.webmanifest`, `/wp-login.php`) and that no file or route serves is rewritten by an `afterFiles` rewrite in `next.config.ts` to `/next/missing-file`, a route handler that answers 404 with a plain-text body; without it the request reached `[market]` as a market named `robots.txt`. Real files still win: `public/` files and file routes (`/favicon.ico` today, M7's `robots.ts` and `sitemap.ts`) are served before `afterFiles` rewrites, and `[market]` is a dynamic route, matched after them. The destination must be a real route, because one that resolves to nothing falls through to `[market]` again. Deeper paths (`/us/robots.txt`) are unchanged: their first segment is a real market and the page behind it decides.
- **A failure in a streamed part cannot change the HTTP status.** Next sends the static shell first with status 200; an error in a part that streams in afterwards renders the error boundary and the status stays 200 (the `loading` docs say so). So a page whose data must give a 5xx when the backend is down needs that data in the static shell (`use cache`, which survives an outage because the shell is served stale) or a status route for monitors (`/next/status` answering 503). ADR 0004 (accepted 2026-10-16, after S4) decides it: the indexable pages (home, PDP, PLP, CMS page, post) read their data in the static shell (`cached()`, `notFound()` before any `Suspense`, `ensureStatic = "navigation"`), and `Suspense` is for per-visitor parts, which read in the browser on those pages, and for `/search`. An outage then serves the last good page, a page that was never rendered answers 5xx, a missing one answers 404, and `/next/status` tells an uptime monitor the state. The M0 wiring page keeps its streamed part until M3 replaces it.

### 8.2 Data layer (port of dtc-starter logic, with known bugs fixed)

**`lib/medusa/*` (`server-only` DAL)**
- SDK singleton with the publishable key. Sends `x-medusa-locale` from the resolved market, per call (the shared SDK keeps none).
- `lib/env.ts` is the one module that reads `process.env` (zod-validated, lazily, so `next build` works with no `.env`); `lib/cache.ts` is the one place that knows how the data layer caches (`cached(fn, { name, tags, life })`: `name` must be unique, arguments and results serializable, region and locale passed in as arguments).
- The DAL returns small DTOs (`Region`, `ProductSummary` with a `Money` in major units, never ÷100), not the SDK's types. `@medusajs/types` is not a storefront dependency: adding it made pnpm install a second copy and broke `medusa build`.
- Cookies: `_medusa_jwt` and `_medusa_cart_id` are **httpOnly, secure, `sameSite: "lax"`**.
- Server actions validate every input with zod, re-check auth, and return minimal DTOs.

**`proxy.ts`**
- Market resolution and rewrite (§8.5). It reads the market map from `/next/markets`, not from Payload (§7.3). It never waits for a refresh once it holds a map.
- CMS redirects.
- CSP split (§11).

**Fixes carried over from the starter study**
- `getAuthHeaders()` returning `{}`, which is truthy.
- A missing `await` on `getCartId()`.
- An axios-shaped `medusaError` handler.
- `payment_sessions[0]` used instead of the `pending` session.
- Radio accessibility.
- In-memory sorting over ≤ 100 products.
- Button-based pagination.
- `ignoreBuildErrors`.
- One-way `?v_id` sync.
- Hard-coded `lang` and en-US formatting.

### 8.3 Caching

**Cache Components** (`cacheComponents: true`, `partialPrefetching: true`), validated by ADR 0001 against the embedded Payload admin on Next 16.4.0 and Payload 3.90.2: **kept on, with no edit to Payload's generated files**. Production mode (`next build && next start`) passes everything with a clean console; `next dev` logs console errors in the admin (Next's dev-only prerender validation, and a React "Maximum update depth" loop in Payload's document and logout views) that the same admin does not log with Cache Components off. That is a recorded limitation: use `next build && next start` when the admin's console matters, and re-check on each minor bump of `next` or `payload`. The fallback (`unstable_cache` + tags, `cacheComponents: false`) was not taken; ADR 0001 lists its steps. CI runs the checks that carry the decision (cache hit, tag revalidation, draft isolation) in `e2e-smoke`.

- **Catalog and CMS reads:** `'use cache'` + `cacheLife` + **global** tags. Region and locale are passed in as arguments. Tags are fixed when `cached()` is called, so a tag per language needs one wrapper per language. `cacheLife` leaves a read out of the prerender when `expire` is under 5 minutes or `stale` under 30 s, and then a root layout that needs it would block.
- **Drafts:** `draftMode()` is read outside the cached function and `isEnabled` is passed in, so it is part of the cache key. (ADR 0001 tested the opposite pattern on purpose, the one of GHSA-3w37-wq28-93x7: 200 concurrent mixed requests leaked nothing on 16.4.0 on one process. That is evidence the fix holds, not a pattern to copy.)
- **Catalog pages (ADR 0004):** the home, PDP, PLP, CMS page and post read in the static shell and export `ensureStatic = "navigation"`, which makes the build refuse request-time work in the route. Their `cacheLife` has a long `expire`, set by the longest outage the shop should ride out and not by freshness: a URL with no traffic for longer than `expire` gives its first visitor a 500 during an outage, and then the old page again. Freshness comes from tags (webhooks, below) and `revalidate`. `ensureStatic` refuses `expire` under 5 minutes, `stale` under 30 s and `revalidate` 0.
- **Build:** with Cache Components, `generateStaticParams` must return at least one param. A catalog page's reads Medusa; while `next build` runs with no `MEDUSA_BACKEND_URL` it returns one placeholder handle that the page turns into a 404 before it asks Medusa anything (D10's rule), and with the URL set, an unreachable Medusa fails the build and names it. So a deployment builds with its backend up.
- **Cart, customer and checkout:** on a catalog page and in the layouts above it, per-visitor parts are Client Components that read in the browser, the header cart count included (`ensureStatic = "navigation"` fails the build on `cookies()` even inside `Suspense`). `Suspense` holes and `'use cache: private'` stay for the dynamic pages (cart, checkout, account) and `/search`. The browser side is `apps/storefront/src/lib/visitor/` (D44): a small store read with `useSyncExternalStore`, whose server snapshot is "unknown", so a prerendered shell never contains a count, and whose cart button reserves its badge's space with `aria-live="polite"` on the count. M2 gives it no source (the DS feeds it from fixtures, so the DS page runs the real island); M3 gives it one, a route handler that reads the httpOnly cart cookie, which the browser cannot read itself. A molecule that shows something per visitor takes it as an optional prop and draws a stable placeholder without it; an organism that holds one takes it as a slot.
- **Mutations:** `updateTag('cart')` / `refresh()`.
- **Webhooks:** `revalidateTag(tag, { expire: 0 })` for price and stock changes, `'max'` for content (both verified under `next start`).
- Vercel propagates `revalidateTag` across functions, so no Redis cache handler is needed. **Not tested on Vercel** (ADR 0001): M7's deployment check repeats three things on a preview: a published edit is fresh by request 2 after a pause, `{ expire: 0 }` is fresh on the next request, and the 200-request draft test shows 0 leaks.
- The page shell under `[market]` regenerates at most every 30 s whatever a content entry's `cacheLife`, so a tag invalidation and the shell are independent clocks.

### 8.4 Commerce features

**PLP**
- Search-backed (`/store/search`) in the active locale.
- Facets: category, collection, option swatches, price in the region currency, in-stock, on-sale.
- Sort by relevance, newest or price.
- SSR first page, crawlable `<a href>` pagination, filters in the URL.

**PDP**
- Two-way variant/URL sync. Unavailable combinations disabled.
- Add to cart disabled until all options are chosen.
- Quantity, gallery variants with zoom, size guide, stock, shipping and returns info.
- Related products, recently viewed, Payload sections, mobile sticky add-to-cart.

**Cart**
- Drawer + page, promo codes, free-shipping progress from Medusa shipping-option rules.

**Checkout**
- 3 steps: contact + address, delivery + payment, review. Only the region's countries are offered; the address format follows the country (D48): AddressForm orders, labels and requires its fields per country from Google's address metadata (libaddressinput's format, required fields, postal-code pattern and name types) for every country Google lists, not only the seeded ones (Principle 10), through `lib-address` 0.7.0 (MIT), which `@shopblok/i18n` reads at development time into one 20 KB file (`pnpm --filter @shopblok/i18n address-formats`); the browser gets only the chosen country's format, a few hundred bytes. A country Google does not list gets a generic form. Phone is a `tel` input with `autocomplete="tel"`. Forms are plain `<form>` elements with native inputs, their values and errors as props, so they post without JavaScript; M3's server actions validate with zod and hand the errors back, and no form library is used.
- Guest checkout on. Pickup options shown when available.
- **Payment step:**
  - Saved methods for signed-in customers.
  - Stripe Payment Element: cards, Apple Pay, Google Pay, Revolut Pay, plus local methods per market.
  - "Save for next time" checkbox.
  - `pp_system_default` when there's no Stripe key and for zero totals.
- The customer's locale is stored on the cart and order, so emails are sent in the right language.

**Account**
- **Email verification required:**
  - Registration creates the account and sends a verification email. With no Resend key, the link is printed in the backend console.
  - Signing in is blocked until the email is verified. This is enforced server-side in the login action and the auth flow, using the dtc-starter verification pattern (`sdk.auth.verification.*`).
  - dtc-starter's **backend has no email-verification code** (only its storefront does). M3 adds: `http.authVerificationsPerActor`, a subscriber on `auth.verification_requested`, `notification-local` on the email channel, and `admin.storefrontUrl`.
  - **[Risk]** Whether Medusa can enforce this natively still needs confirming in M3.
- Password reset, address book, paginated orders, order detail, guest-order claim (verified accounts only), returns request.
- **Saved payment methods:** list and remove them.
- Wishlist arrives in M8.

**Search overlay:** instant product results, recent queries, keyboard-navigable.

**Market switcher:** country + language together, listing only the enabled markets. Changing country updates the cart's `region_id`; changing language keeps the cart.

**Consent:** a localized cookie banner (necessary / analytics / marketing). PostHog loads only after analytics consent, using the EU host, with session replay off.

### 8.5 Markets, languages and URLs

**Market model**
- A market is a **country + language**.
- The country belongs to a Medusa region, which sets currency, taxes, payment and shipping providers.
- **One Medusa locale per language** (D8), stored with the language in `markets`: `el→el-GR`, `de→de-DE`, `fr→fr-FR`, `en→en-US`. Medusa's Locale table holds 51 BCP 47 codes (`el-GR`, `pt-BR`, `de-CH`, …); it has no bare `el` and no `el-CY`. So the store's locales are `en-US`, `el-GR`, `de-DE`, `fr-FR`, not `en/de/fr/el`, and `de-CH` and `fr-CH` shoppers see the German and French translations.

**Seeded markets** (all editable in settings)

| Country | Languages (default first) | Currency | Public URL(s) | hreflang |
|---|---|---|---|---|
| **Cyprus (primary)** | el | EUR | `/` | el-CY |
| United States | en | USD | `/us/` | en-US, x-default |
| United Kingdom | en | GBP | `/gb/` | en-GB |
| Germany | de | EUR | `/de/` | de-DE |
| France | fr | EUR | `/fr/` | fr-FR |
| Switzerland | de, fr | CHF | `/ch/`, `/ch/fr/` | de-CH, fr-CH |

- **Primary market:** Cyprus in Greek, served at `/`. Set per brand in Payload → Markets.
- **Base language: English.** Content is authored in English first, and English is the fallback for missing translations.
  - Payload: `defaultLocale: 'en'`, fixed per brand at setup.
  - Medusa: the entity's original strings, in English.
  - The base language is separate from the primary market, so a German shopper with a missing translation sees English, not Greek.
- **Fallback market (x-default):** shown to visitors whose language matches none of the markets. A Markets setting, seeded to the US English market (`/us/`).

**URL scheme [Decided]**: subfolders on one domain, with each segment shown only when it's needed:

| Public URL | Shows |
|---|---|
| `/` | the primary country, in its default language |
| `/{country}/` | any other country, in its default language |
| `/{country}/{lang}/` | a country's additional languages (`/ch/fr/`; `/cy/en/` if Cyprus gets English) |

- **Store with one country:** no country segment. Extra languages, if any, use `/{lang}/`.
- **Country with one language:** no language segment.
- `/{primary-country}/` (here `/cy/`) 301-redirects to `/` (after Next's 308 to the slashless URL: two hops, §8.1). Slashes in this spec's URLs are notation.
- Codes are lowercase ISO 3166-1 countries (`gb`, not `uk`) and ISO 639-1 languages (`el` for Greek).
- **Optional domain per country** (e.g. `shop.com.cy`): on that domain the country segment is dropped, only that country is served there (its default language at `/`, extra languages at `/{lang}/`), and links and hreflang from other markets are absolute URLs on the domain. On any other host the country is still served under the usual segments, with no redirect to the domain (it may not be wired to Vercel yet). Domains are added to the Vercel project and set in `markets`.
- Adding a country or language later never changes existing URLs, with one exception: a single-country shop with an extra language serves it at `/{lang}/…`, and when it opens a second country that language moves to `/{country}/{lang}/…`.
- `[market]` is a `next/root-params` root param. next-intl 4.14 reads it in `getRequestConfig` (`setRequestLocale` is deprecated); route handlers and server actions pass `locale` explicitly; next-intl's `Link` and `createNavigation` are not used (the link builder is).

**No automatic geo-redirects.** Google advises against them, and Googlebot mostly crawls from the US.
- A localized banner suggests the shopper's likely market instead (country from `x-vercel-ip-country`, language from `Accept-Language`). For example, a US visitor landing on `/` is offered `/us/`.
- An **explicit** choice is remembered in a cookie, and only then can `/` redirect to it.

**Adding a market in settings (no code, no deploy)** (D17: one place per app, and everything follows. The steps below are the ones M0 ran for Brazil and Mongolia: SETUP.md, "Opening a market")
1. **Medusa:** add the country to a region, or create a region with its currency, taxes, payment and shipping providers. In M0 that is `apps/backend/src/config/markets.ts` (`SUPPORTED_CURRENCIES`, `MARKET_REGIONS`), applied by `pnpm bootstrap`: the store's currencies, the regions, tax regions and shipping, and the search index's `min_price_<currency>` fields all follow that file. A currency added to a database that exists needs `medusa db:migrate` and a restart before the index has its price fields (bootstrap runs the migration). The seed adds and never removes, so a market taken out of the file leaves its region behind; `doctor --online` lists it.
2. **Store locales:** add the language to `SUPPORTED_LOCALES` in the same file, if it's new. The seed sets the store's locales to exactly that list, so a locale added only in Medusa Admin is removed on the next seed.
3. **Payload → Markets:** enable the country, choose its languages and default language, the Medusa locale of each language, and optionally a domain. In M0 this is a second list kept by hand (D19), and `pnpm run doctor` checks that the two agree; M4's sync fills the read-only part and removes the duplication. A language outside Payload's 42 first needs the one-line change and the migration below.
4. **Translate:**
   - Catalog: Medusa Admin → Settings → Translations (spreadsheet-style bulk editor).
   - Content, UI strings and email copy: Payload, using the locale switcher.
   - Missing translations fall back to English, both in Medusa and in Payload.
5. The storefront picks it up through tag revalidation: proxy market map (a saved map reaches the proxy in 30 to about 65 s), sitemaps, hreflang, switcher.

A language outside Payload's 42 preloaded ones needs **one line in `locales.ts` and one saved migration** (four `ALTER TYPE … ADD VALUE`, milliseconds), deployed before the code; see SETUP.md, "A language outside the list". Locales only grow: a closed market is switched off in `markets`, never removed from the list (ADR 0003).

**Where translations live**

| Content | Source of truth | Mechanism |
|---|---|---|
| Product, variant, option, category, collection, tag and type text; shipping option names | Medusa | Translation Module (`x-medusa-locale` from the URL) |
| Pages, globals, blocks, catalog enrichment, SEO, media alt text, posts | Payload | Field-level `localized: true`, `fallback: true` |
| UI microcopy | Payload `ui-strings` (seeded from `@shopblok/i18n`) | `next-intl`, with messages loaded from Payload and cached. M0 ships `en`, `el`, `de`, `fr`; a market in another language shows English text until its catalog is added (M3) |
| Email copy | Payload `email-templates` | Read by the Medusa Resend provider at send time |
| Prices, dates | Medusa region currency + locale | `Intl` (never ÷100) |

**Search** (validated by ADR 0002): one Meilisearch index per locale for the M6 provider; one multilingual index on the keyless Postgres default; the request's locale reaches `/store/search` through a middleware (§6.2). A language added in the store is searchable with no restart on Postgres, and on Meilisearch from the first write of the new locale, with the default locale's index answering until then. **[Risk]** The Search Module is new and the per-locale design relies on Medusa behaviour that is not documented; `search-locale-assumptions.spec.ts` guards it in CI.

---

## 9. Design system

### 9.1 Source of truth: Figma

- **File:** "shadcn/ui – Design System by ReUI" (community, **CC BY 4.0**, credited in the README, in `packages/ui/NOTICE.md` and on the DS page). Your copy: `1PUSIlNviAwiZT0praTxES`.
- **Access confirmed** after the plan upgrade (2026-10-08). From the variables on one component canvas:

| Variable group | Observed |
|---|---|
| Font | `font/family/font-sans` = **Inter**. Weights 400, 500, 600, 700 |
| Type scale | Tailwind steps, e.g. `text/xs` 12/16, `text/lg` 18/28, `text/xl` 20/28, `text/4xl` 36 |
| Radius | xs 2, sm 6, md 8, **lg 10**, xl 14, 2xl 18, 3xl 22, 4xl 26. This is the shadcn v4 scale on a 10 px base |
| Color | shadcn neutral (`base/background`, `base/foreground`, `base/muted`, `base/muted-foreground`, `base/accent`, `base/border`), plus opacity variants and an `info` hue |
| Spacing | Variables named after Tailwind classes (`gap/gap-2` = 8, `padding/padding-x/px-3` = 12, `size/size-5` = 20) |
| Modes | Light and dark values exist. The export keeps every mode (below); **`tokens.css` is light only** |

- **Pipeline (M1):**
  1. **Export.** Read-only plugin-API code, committed as `scripts/figma/export-variables.js`, runs through the Figma connector's `use_figma` tool, from any session where the connector is signed in (T18 ran in a cloud session; D24). The connector answers at most 20,480 bytes, so the code returns one slice per run and `scripts/figma/assemble.ts` joins the slices after checking their length and hash.
  2. **Commit `packages/ui/tokens/figma.tokens.json`:** Figma's own variable model, normalised (D25): every collection with every mode, dark included; each variable's name, type, scopes, code syntax, description and value per mode; aliases as `collection/name`; colours as `#rrggbb(aa)`; keys and lists sorted; no ids and no dates. The kit's text and effect styles are in a second section. An unchanged file exports to an empty diff.
  3. **`packages/ui/tokens/shopblok.tokens.json`, by hand (D27):** §9.2's commerce tokens as references to primitives, the contrast pairs, any AA override, and what the kit lacks (design widths, z-index, containers, motion). The export is a pure copy of the kit, so a re-export never fights a hand edit.
  4. **`pnpm tokens`** (`scripts/figma-tokens.ts`, Style Dictionary 5.6.1; D26): a custom parser reads the Figma file as DTCG tokens, a custom format writes `:root` and `@theme inline` (Style Dictionary's own `css/variables` writes `:root` only), and the contrast, radius and spacing checks (§9.2) run on the resolved tokens before anything is written. It writes `packages/ui/src/styles/tokens.css` and `packages/ui/src/tokens.ts` (the same facts as data for the DS pages), light only. Both are committed, so `packages/ui` has no build step (D3), and a test fails when the committed files differ from the build.
  5. Re-running the export shows any drift in a git diff.
- Known issue: about 9 components in the kit have broken property configurations when published as a library. We read variables and use the frames as visual reference only. **The copy of the kit has none of the shadcn atoms' component sets** (T18): it draws payment-method icons and country flags, and the atoms come from the registries below.
- **Primitives:** shadcn/ui (Base UI flavour, style `base-vega`) through its CLI, and ReUI's free items from its registry (`https://reui.io/r/{style}/{name}.json`, namespace `@reui`; no npm package). ReUI's licence (updated 2026-09-28) puts the items of its public repository under MIT, notice kept (`packages/ui/NOTICE.md`); its Pro blocks, templates and icons are not used. The vendored files live in `packages/ui/src/atoms/`, are ours to edit, and each keeps a header naming its source, style and date.
- **Code in `packages/ui` (D30):** subpath exports (`@shopblok/ui/atoms/button`, `@shopblok/ui/globals.css`) and no barrel file. Atoms take every visible string as a prop (Principle 9); their copy lives in `@shopblok/i18n`. The package may import `next/link` and `next/image` (`next` is a peer) and nothing server-only, and it declares React as a peer, which `check:workspace` checks.
- All components handle long translated strings (German runs about 30% longer, Greek is often long too) and use logical properties.
- Inter covers the Greek script, so subset it to Latin + Latin-ext + Greek.

### 9.2 Tokens

| Layer | Contents |
|---|---|
| Primitive | Neutral scale (with greys of our own where the kit has none that passes), status hues, Inter, type scale, spacing, radii, shadows, motion, breakpoints (the kit's five, Tailwind's) and the design widths 375/768/1024/1440 (`--viewport-phone` to `-desktop`), z-index, containers |
| Semantic (shadcn contract) | `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar-*` (+ `-foreground`) |
| Semantic (commerce additions) | `price`, `price-sale`, `price-original`, `rating`, `success`, `warning`, `info`, `badge-sale`, `badge-new`, `stock-in`, `stock-low`, `stock-out`, `overlay` |
| Brand override | `brands/<name>.css` reassigns semantic tokens, fonts and radius only |

Light theme only. `tokens.css` has one `:root` and one `@theme inline`, and no `.dark` and no `prefers-color-scheme`.

- **Radius:** one `--radius` (10 px, the kit's `lg`) and shadcn's derived scale, `--radius-xs` to `--radius-4xl` as `calc(var(--radius) ± n px)`. The build fails unless the kit's own eight values equal the derived ones. A brand changes one value and the whole scale follows.
- **Spacing** is Tailwind's 4 px step (`--spacing: 0.25rem`). The kit's spacing variables are checked against it and not emitted.
- **Contrast pairs (D35).** `shopblok.tokens.json` declares them: 36 in M1, 31 text pairs at 4.5:1 and 5 UI pairs at 3:1. Text: each `*-foreground` on its surface, `muted-foreground` on `muted` and on `background`, and the price, badge, stock and status tokens on the surfaces they sit on. UI: `input` against `background` (a text field's edge), `ring` and `sidebar-ring` (drawn at full strength, not at 50 %), `primary` and `rating` against `background`. `border` is decorative (separators, card edges) and is not checked. A translucent colour is composited over its surface first. Every `foreground`, `*-foreground` and `*-ring` token must be in a pair or listed with a reason.
- **Overrides.** A pair the kit fails is fixed in `shopblok.tokens.json` by pointing the semantic token at the lightest colour that passes, never in `figma.tokens.json`. The kit fails the gate in eight places (`input`, `ring`, `muted-foreground`, `destructive-foreground`, `sidebar-ring`, and the commerce hues `success`, `warning`, `info`); the build prints every override beside the kit's value, the DS Foundations page shows both, and SETUP.md ("Tokens (T19)") has each with both ratios.

### 9.3 Atomic inventory (v1)

**Atoms:** Button, IconButton, Link, Input, Textarea, Select, NativeSelect, Checkbox, Radio, Switch, Label, Badge, Chip, Price, Rating, Swatch, SizePill, QuantityStepper, Skeleton, Spinner, Avatar, Icon, Logo, Separator, Kbd, Tooltip, Progress, StockIndicator, VisuallyHidden, Image, PaymentIcon (incl. Apple Pay, Google Pay, Revolut), Flag.

**All 32 atoms are built** (M1), in `packages/ui/src/atoms/`, on the tokens (no colour literals, logical properties only) and with component tests for their states, keyboard use and long strings. Where each comes from (D31):
- **shadcn (17):** Button, Input, Textarea, Select, NativeSelect, Checkbox, Radio (`radio-group`), Switch, Label, Badge, Skeleton, Spinner, Avatar, Separator, Kbd, Tooltip, Progress. There is one Badge: shadcn's.
- **ReUI's free registry items (2):** Rating (`rating`, read-only) and QuantityStepper (built on `number-field`).
- **Ours, on the tokens (13):** IconButton, Link, Chip, Price, Swatch, SizePill, StockIndicator, VisuallyHidden, Image, Icon, Logo, PaymentIcon and Flag. PaymentIcon's marks come from Simple Icons (CC0 data): Visa, Mastercard, American Express, Apple Pay, Google Pay, Revolut, PayPal and Klarna, single-colour, and each mark remains its owner's trademark (Simple Icons' disclaimer). A provider that requires its own artwork on a payment page (Apple Pay's mark guidelines, for one) gets it with that integration (M6). Flag's SVGs come from `country-flag-icons` (MIT); no emoji (Principle 8).

**Molecules:** ProductCard (variants), PriceBlock, VariantSelector, SearchField, Breadcrumbs, Pagination, SortSelect, FilterGroup, ActiveFilterChips, CartLineItem, PromoCodeField, FreeShippingProgress, AddressCard, AddressForm (per-country format), ShippingOptionCard, PaymentMethodCard, **SavedPaymentMethodCard**, OrderSummaryRow, ReviewItem, RatingSummary, NewsletterForm, MarketSwitcher, Stepper, EmptyState, Toast, CopyCodeChip, CountdownTimer, AccordionItem, MediaFigure, ShippingEstimator, **VerificationNotice**.

**Organisms:** Header (6), MegaMenu, MobileNavDrawer, AnnouncementBar, Footer (5), CartDrawer, QuickCartDropdown, SearchOverlay, FilterSidebar, FilterDrawer, ProductToolbar, ProductGrid, ProductCarousel, ProductGallery, BuyBox, MobileStickyATC, ProductInfoAccordions, ReviewsSection, CheckoutSteps, PaymentStep, OrderSummary, AccountNav, OrderTimeline, OrderTable, AddressBook, PaymentMethodsManager, ReturnRequestForm, CookieConsent, QuickViewDialog, SizeGuideDialog, CompareTray, MarketSuggestionBanner, loading skeletons.

**M2 builds the molecules and organisms** (`packages/ui/src/molecules/`, `src/organisms/`; the structural pieces under them are in `src/primitives/`, D42). The DS lists 40 molecule entries (the 30 other molecules and ProductCard's ten variants), 31 organism entries and 11 headers and footers (Header's six and Footer's five stand for those two names), so 114 entries outside Foundations (122 with its 8). Where the primitives come from (D47):
- **shadcn, `base-vega`, through the CLI (20):** accordion, breadcrumb, carousel (embla-carousel-react 8.6.0), collapsible, dialog, drawer (Base UI's Drawer: the bottom sheet of §9.4), dropdown-menu, field, input-group, navigation-menu (the mega menu), pagination (links, §8.4), popover, scroll-area, sheet (side drawers), slider (the price filter), table, tabs, toast (Base UI's Toast) and toggle and toggle-group.
- **ReUI (MIT):** `stepper` and `timeline`. **Base UI directly:** Autocomplete, for the search overlay. **Not used:** shadcn's `sonner` (it needs `next-themes`, a dark-mode helper, and the theme is light only), `command` (cmdk), ReUI's `filters` (a query builder with `date-fns`), ReUI's `phone-input` and any form library.
- **Rules that carry over from the atoms:** tokens only, logical properties, 44 × 44 px targets, the ring at full strength, a source header on vendored files, and a scan of all four folders. A component is a server component unless it needs state or events; it fetches nothing, reads no cookie and builds no URL (links arrive as `href`s, actions as props or slots, money as `Money` with the locale), and takes its strings as one `copy` prop (D42, D43).

**Sections:** the blocks in §7.4.

**Templates:** Home, CMS page, Post, PLP, PDP, Search, Cart, Checkout, Order confirmation, Order lookup, Account (dashboard, orders, order detail, addresses, profile, payment methods, returns), Wishlist, Auth (login, register, verify, forgot, reset), 404, 500.

**Pages:** templates rendered with fixtures on the DS page (with a locale switch), and with live data in the app.

### 9.4 Header and footer variants

**Headers (6)**
- Classic
- Centered logo with split nav
- Two-tier with a utility bar holding the market switcher
- Mega-menu
- Minimal (hamburger on every breakpoint)
- Transparent over hero

**Footers (5)**
- Multi-column
- Newsletter-first
- Minimal single row
- Big wordmark
- Two-tier with a legal/payment/market bar

**Mobile behaviour** (every variant): drawer nav, bottom-sheet market switcher (Base UI's Drawer; a popover from `md` up), and the cart is always visible. The market switcher is a client component that receives each option's flag as a node the server rendered, so `country-flag-icons` never reaches a client bundle (D49; a test reads the built chunks for a flag's SVG). The cart count is the visitor store's (§8.3).

### 9.5 Block library: original designs, ReUI as reference

**Constraint**
- The 87 ReUI eCommerce blocks are ReUI Pro, and no license is held.
- ReUI's license (updated 2026-09-28) also bars Pro blocks from starter kits and design kits without an OEM license.

**Approach**
- ReUI's eCommerce blocks (13 categories) and shadcnspace's ecommerce blocks (9 categories, 42 blocks) are the **reference** for component categories and layout archetypes. Examples:
  - bento hero
  - split editorial hero
  - collection-switcher hero
  - checkout with a sticky order summary
  - faceted sidebar with removable chips
  - mini-cart sheet with free-shipping progress
  - statement-style receipt
- Every variant is an **original** composition on our tokens.
- We work from the pattern-level inventory (category + one-line layout description). We don't trace screenshots or make one-for-one lookalikes.

**Licensed code we can use**
- shadcnspace **free** blocks (keep the notice):
  - Ecommerce: Product Category 02/04, Product Overview 04, Product Listing 01, Checkout 03, Receipt 01–04.
  - Other: Navbar 01, Footer 01/02, Newsletter 01, Testimonials 01/02, FAQ 01, Logo Cloud 01, Cookie Consent 01, Auth 01s, Empty State 01/02/06, Blog 01/04.
- ReUI's MIT component set.

| Pattern category (reference) | Target variants | Becomes | Medusa dependency |
|---|---|---|---|
| Shop hero | 8 | `hero` | product/collection sources |
| Category card / product category | 6 | `categoryShowcase` | categories + Payload images |
| Product card | 10 | ProductCard variants | products, prices |
| Product grid / listing | 6 | `productCollection` + PLP grid | products |
| Product detail / overview | 6 | PDP gallery × buy-box variants | product, variants, inventory |
| Product quick view | 3 | QuickViewDialog | product |
| Filter sidebar | 7 | PLP filter variants | search facets |
| Shopping cart | 7 | Cart page + drawer + dropdown | cart, promotions |
| Checkout | 5 | 3-step, one-page, express rail | cart, shipping, payment |
| Receipt | 6 | Order confirmation + order detail | order, fulfillment |
| Review | 6 | `testimonials` + PDP reviews | reviews module (M8) |
| Wishlist | 6 | Wishlist page + account tab | wishlist module (M8) |
| Comparison | 3 | `comparison` + CompareTray | product attributes |
| Coupon | 6 | `promoBanner`, announcement variant, promo popup | promotions |
| Frequently bought together | 2 | `bundle` | products |

**Built in M2 (D46):** Header (6), Footer (5) and ProductCard (10): `standard`, `swatches`, `quick-add`, `overlay`, `minimal`, `horizontal`, `compact`, `editorial`, `bordered` and `image-swap`, each its own registry entry and DS page in the family `header`, `footer` or `product-card`. The variant counts above for the other rows (gallery × buy box 6, quick view 3, filter sidebar 7, cart 7, checkout 5, receipt 6, and the blocks) belong to M3 and M5.

**Gaps neither library covers** (all in v1):
- Navigation: mobile nav drawer, market switcher + suggestion banner, payment/market footer row.
- Search: predictive search overlay.
- PDP: gallery zoom, size guide, back-in-stock form, mobile sticky add-to-cart, shipping estimator.
- Account: dashboard, order history, address book, saved payment methods, returns request, guest order lookup, email verification screens.
- States: commerce empty states, loading skeletons.
- Marketing: USP bar, recently viewed.
- Deferred to v1.1: product Q&A, lookbook hotspots, store locator, gift cards.

### 9.6 Design-system reference page

**Route and access:** `/design-system/[locale]/…`, where `locale` is `en`, `de`, `fr` or `el`. The locale is a path segment, so every page is static and needs no database, backend or proxy. `/design-system` redirects (307) to `/design-system/en`, and `design-system` is a reserved first segment (§8.1). The DS has root layouts of its own (the app has none at the top), so `<html lang>` follows the locale. `noindex, nofollow`, excluded from the sitemap; M7's `robots.ts` disallows it (§12). No Storybook.
- **Gate:** on in `next dev`. In a production build it is on only when `DESIGN_SYSTEM_ENABLED=true` at build time, and the value is frozen into the bundle (setting it on `next start` changes nothing); otherwise every DS route is a 404. The Payload login this section used to ask for moves to M7, because it would make every DS page dynamic and Payload cannot be imported into `proxy.ts` (D10).
- **Locale and market:** each locale renders with one market's formats: `en` with `en-US` and USD, `el` with `el-CY` and EUR, `de` with `de-DE` and EUR, `fr` with `fr-CH` and CHF. The DS's own chrome (header, navigation, labels) is in English; an entry's content is in the chosen locale.

**Navigation tree**
- Foundations (8 entries in M1): colors (the contrast pairs, and the kit's value beside ours where overridden), typography, spacing, radius, shadows, motion, breakpoints with design widths and layers, icons and credits (the kit's CC BY 4.0 credit among them).
- Atoms (the 32 of §9.3), Molecules (40 entries in M2), Organisms (31).
- Headers and Footers (11 in M2: six headers, five footers). The groups' order is the registry's: `foundations`, `atoms`, `molecules`, `organisms`, `headers-footers`.
- Sections (every block × variant).
- Templates.
- Pages.

**Each entry shows**
- A live render with fixtures from `@shopblok/fixtures`.
- A states matrix. Hover and focus cannot be held on a static page, so those states draw the classes that `:hover` and `:focus-visible` add, and say so.
- A **viewport switcher** (375 / 768 / 1440 px iframes of the frame route, side by side or one at a time, scaled to fit the column).
- A **locale toggle** (en / de / fr / el) for long strings and currency formats.
- a11y notes and, from M4, the matching Payload block schema.
- A **Props** table when the entry has a contract: the top-level properties of its view model from `z.toJSONSchema` (type, required, description).
- **Overlays drawn open** (a drawer, dialog, sheet, popover, menu or toast) inside a box of fixed height that is a containing block for `position: fixed` (`contain: paint`), with their portal pointed into it and `modal={false}`, so several open states fit on one frame and every check sees them; the live render has the real trigger, and an interaction check opens it from the keyboard at 375 and 1440 px and runs axe and the focus checks on the open state (D45).
- **A fixed clock and reduced motion** (fixtures carry a `now`; the checks set Playwright's clock to it), so a countdown or "3 days ago" looks the same on every run (D50).

**Generation:** the entries come from `@shopblok/registry` (D40); each has a story in `apps/storefront/src/design-system/stories/`, keyed by its id, and a test fails when a story has no entry or an entry has no story. The overview, entry, frame and `preview` pages export `ensureStatic = "navigation"`, so a build fails if anything on them reads the request (D44). `/design-system/{locale}/preview/{id}` is the live render alone, with no states and no chrome. **Thumbnails (D52):** the 21 variants a shop picks (D46) each get one, the preview at 1200 × 800 CSS px captured at half scale as a 600 × 400 PNG (3:2, §7.4), kept as that preview's baseline at `apps/storefront/public/registry/{id}.png` and served from `public/`; so the screenshot and the thumbnail are one file, and the registry's `thumbnail` is that path. The `design-system` CI job (§14) compares every cell outside Foundations with a baseline in `en`; the baselines are committed (D51).

---

## 10. Integrations

| Integration | Where | Turns on when | Fallback |
|---|---|---|---|
| **Stripe** | Medusa provider + Payment Element | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_KEY` + region enable script | `pp_system_default` |
| **Resend** | Medusa notification provider + Payload email adapter | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | console (`notification-local`) / Mailpit |
| **PostHog** | Medusa Analytics Module + `posthog-js` (after consent) | `POSTHOG_EVENTS_API_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY` | `analytics-local` / no client script |
| **Sentry** | Backend `instrumentation.ts`; `@sentry/nextjs`; `plugin-sentry` | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`; `SENTRY_AUTH_TOKEN` is optional (it only uploads source maps) | not initialised |
| **Meilisearch** | Medusa Search provider (custom, M6) | `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` (set locally by default; until M6 the provider does not exist, so these keys change nothing and `doctor` reports the fallback) | `search-postgres` |
| **Redis** | Medusa modules, sessions, rate limiting | `REDIS_URL` (set locally by default) | in-memory: fine in development, and a `doctor` warning in production, where the event bus would then never leave the process |
| **Cloudflare R2** | Medusa `file-s3`, Payload `storage-s3` | `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL` (both apps; §15's backend row called it `S3_FILE_URL`, and M6 settles one name) | local disk (dev only; Vercel needs R2) |

An integration is **live** when its keys are set *and* the code that uses them exists; in M0 only Redis qualifies, the rest report their fallback whatever is set (`doctor`'s `wired` flag, flipped by M6).

### 10.1 Stripe: cards, saved cards, Apple Pay, Google Pay, Revolut Pay

**Provider**
- `@medusajs/medusa/payment-stripe` with `automatic_payment_methods: true` and `capture: false`.
- Stripe then shows every method enabled in the Stripe Dashboard **wherever it's eligible** (device, country, currency).
- Enabling a method is a Dashboard toggle, not code.

| Method | Where it shows | Notes |
|---|---|---|
| Cards | all markets | Saved for signed-in customers who tick "Save for next time" |
| Apple Pay | Safari / iOS devices with a wallet | Needs domain registration in Stripe for each production domain (and per-market domain) |
| Google Pay | Chrome / Android with a wallet | Same domain registration flow |
| **Revolut Pay** | **UK and EU markets** (GBP, EUR and a few others; not the US) | Wallet. Confirmed in the Revolut app (mobile) or by QR code (desktop), then the shopper returns via `/api/payment-return`. Supports recurring, so it can be saved |
| Local methods (iDEAL, Bancontact, BLIK, …) | per market | Dashboard toggle |

Apple Pay and Google Pay **don't need saving**: the wallet already stores the shopper's cards.

**Saved methods**
- Follows Medusa's official saved-payment-methods tutorial:
  - an account holder per customer;
  - `listPaymentMethods`;
  - `setup_future_usage: "off_session"` when initiating the session.
- Adapted from the tutorial's legacy Card Element to the **Payment Element**. Saved methods render as selectable cards above it, using the design system's components.
- **[Risk]** Saving non-card methods (Revolut Pay) through Medusa's Stripe provider. Verify in M6.

**Webhook:** `{railway}/hooks/payment/stripe_stripe` with `payment_intent.amount_capturable_updated`, `.succeeded`, `.payment_failed`, `.partially_funded`.

**v1.1 option:** the Express Checkout Element (wallet buttons on the cart and PDP).

### 10.2 Resend

- Custom provider per the official guide. Layouts in `@shopblok/emails`; localized copy from Payload `email-templates`.
- One provider per channel.
- A verified sending domain is required before production sign-ups. `pnpm run doctor` flags it because sign-up requires verification.

### 10.3 PostHog

- **Server:** Analytics Module, always registered. The provider option is `posthogEventsKey`, as the code examples use.
- **Client:** `posthog-js` after consent, through a same-origin `/ingest/*` rewrite.
- EU host, session replay off.
- Events carry `market` and `locale`.

### 10.4 Sentry

- **Backend:** adapt Medusa's guide to the current Sentry SDK's OpenTelemetry integration (the guide's package is stuck on v7). Skipped when there's no DSN.
- **Storefront:** `@sentry/nextjs` + a tunnel route + the Vercel integration. CSP reports go to Sentry.
- **Payload:** `plugin-sentry`.

### 10.5 Meilisearch

- Medusa deprecated the direct-to-Meilisearch guide in 2.21.1, so Meilisearch is implemented as a **Search Module provider**.
- The browser only calls `/store/search`, and the keys stay on Railway.
- One index per locale and per version (ADR 0002, §6.2); versioned zero-downtime reindexing. The prototype's shape is the model for the provider; its changes are listed in ADR 0002, "Consequences".

### 10.6 Redis

- One Railway Redis to start. The caching module needs `MEDUSA_FF_CACHING=true` and is gated on `REDIS_URL`.

### 10.7 Object storage: Cloudflare R2 everywhere [Decided]

- **R2 for Medusa files and Payload media in every environment.** No MinIO and no Railway Buckets.
- **Locally:** R2 can't run on your machine. Cloudflare's local tooling only emulates R2 inside Workers, not over the S3 API. So:
  - **No keys:** local disk (Medusa `file-local`, Payload local `staticDir`). The starter still boots with no accounts.
  - **Dev bucket keys set:** local dev uses R2 too, identical to production.
- **Buckets:** one per environment and brand (`shopblok-<brand>-dev`, `-staging`, `-prod`).
- **Config:**
  - `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
  - `S3_REGION=auto`
  - `S3_PUBLIC_URL` = the public domain.
- **Public access:**
  - Staging and production use an R2 **custom domain** (e.g. `media.<brand>.com`). This needs the domain's DNS on Cloudflare.
  - Dev buckets can use the rate-limited `r2.dev` URL.
- **Payload on Vercel:** `clientUploads: true` (signed direct-to-R2 uploads, so the 4.5 MB body cap doesn't apply), plus an R2 CORS rule for the admin origin. Media is served straight from the R2 domain (`disablePayloadAccessControl` + `generateFileURL`).
- **Next images:** the R2 domain goes in `remotePatterns`. `dangerouslyAllowLocalIP` is only true in dev, for local-disk files.
- **Optional:** a Cloudflare Image Transformations loader instead of Vercel's metered image optimizer.
- **[Risk]** R2 public access is set per bucket. Medusa's private files (CSV imports and exports) would sit in the same bucket under unguessable keys. Mitigation: a Cloudflare WAF rule blocking that prefix on the public domain, or a second private bucket if Medusa's file module allows. Verify in M6.

### 10.8 Hosting topology: Vercel + Railway [Decided]

| Piece | Where | Notes |
|---|---|---|
| Storefront + Payload | **Vercel**, root `apps/storefront` | Function region pinned next to the Railway region. Market domains added to the project |
| Payload jobs | Vercel Cron → `/api/payload-jobs/run` (`CRON_SECRET`) | Scheduled publish |
| Payload DB | Railway Postgres (`payload` DB) | Pooled connection string, small `pool.max`. Migrations in the build step |
| Medusa server | Railway (`MEDUSA_WORKER_MODE=server`, admin `/app`) | Predeploy migrations, `/health` |
| Medusa worker | Railway (`MEDUSA_WORKER_MODE=worker`, admin disabled) | Subscribers, jobs, indexing, sync, emails |
| Postgres, Redis, Meilisearch | Railway | Meilisearch with a volume |
| Files and media | **Cloudflare R2** + custom domain | §10.7 |

**Environments:** Railway production / staging (+ optional PR environments) paired with Vercel Production / Preview. Previews always use staging.

**Cross-service calls**

| From | To | Auth |
|---|---|---|
| Medusa worker | Payload REST on Vercel | `integrations` API key |
| Medusa worker | `{vercel}/api/revalidate` | `REVALIDATE_SECRET` |
| Stripe | `{railway}/hooks/payment/stripe_stripe` | webhook signature |

Sync is one-way: Medusa → Payload.

**Platform notes**
- Rate limiting: Vercel Firewall rules on Vercel; an app-level Redis limiter on Railway.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` isn't needed on Vercel.
- One region per brand for every service. For the Cyprus-primary seed, EU (e.g. Frankfurt or Amsterdam) is closest.

---

## 11. Security

### 11.1 Next.js

**CSP split by route.** Nonce-based CSP is incompatible with partial prerendering, so:

| Routes | Policy |
|---|---|
| Cached routes | Static CSP with allow-lists: Stripe (`js.stripe.com`, `*.stripe.com` frames), PostHog proxy, Sentry tunnel, the R2 media domain, the Railway API origin. `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'` (live preview), `upgrade-insecure-requests` |
| `/checkout`, `/cart`, `/account`, `/order` | **Nonce + `'strict-dynamic'`** from `proxy.ts` |
| `/admin`, Payload `/api` | Their own policy, tested against the admin UI |

- Roll out report-only first, with reports going to Sentry.
- Evaluate experimental SRI.

**Headers:** HSTS preload, `nosniff`, `strict-origin-when-cross-origin`, `Permissions-Policy` (with `payment` allowed for Stripe and wallets), `X-Frame-Options: SAMEORIGIN`, `poweredByHeader: false`.

**Data Access Layer:** `server-only` everywhere; only the DAL reads `process.env`; `experimental.taint` for customer objects and secrets.

**Server actions**
- zod validation, re-authentication and authorization (IDOR) in every action.
- Minimal return data.
- Rate limiting on auth, verification and form actions.

**Environment variables:** only public values carry `NEXT_PUBLIC_`. They are inlined at build time, so adding public keys means a Vercel redeploy.

**Other**
- Draft mode: secret + Payload auth + `getSafeRedirect`, exit via POST.
- Images: strict `remotePatterns`, limited redirects, no SVG optimization.
- Build hygiene: type errors fail the build, and lint is a CI step of its own (`next build` no longer lints in Next 16). Next is pinned exactly (16.4.1, §3).

### 11.2 Medusa

- `JWT_SECRET` / `COOKIE_SECRET`; strict CORS (production and market domains + this project's preview regex only).
- Publishable key scoped to the sales channel; Stripe webhook signatures.
- `allowFields` only for intended fields.
- Saved-payment-method routes scoped to the authenticated customer's own account holder.
- Redis rate limiting on auth, verification and cart completion. Admin MFA.
- Email verification enforced server-side.

### 11.3 Payload

- `serverURL` (CSRF), `cors`, secure cookies.
- Lockout (5 attempts / 10 min), sessions, GraphQL disabled.
- Access control everywhere; drafts hidden from the public.
- The `integrations` user has narrowly scoped write access. **Never** use the example's `?is_from_medusa` check.
- Form submissions: honeypot, rate limit, optional Turnstile.
- Uploads: MIME allow-list, size caps, `clientUploads.access`, no unsanitized SVG.
- Import/export restricted to admins.

---

## 12. SEO

**Metadata**
- `metadataBase` is the primary domain. The title template comes from `site-settings` (localized).
- `generateMetadata` cascade:
  1. Payload `meta` (localized)
  2. Medusa data (translated)
  3. `site-settings` defaults
- Descriptions are 150–160 characters.

**Canonical:** self-referencing per market URL. Filtered and sorted PLPs point to the unfiltered page. Paginated pages are self-canonical. `?variant=` points to the base PDP.

**hreflang**
- Every market variant of a URL: `el-CY` → `/`, `en-US` → `/us/`, `en-GB` → `/gb/`, `de-DE` → `/de/`, `fr-FR` → `/fr/`, `de-CH` → `/ch/`, `fr-CH` → `/ch/fr/`.
- Plus `x-default` → the fallback market (`/us/`).
- Per-country domains are included.
- With a single market, no hreflang is emitted.

**`<html lang>`:** per market (`el-CY`, `de-CH`, …).

**`robots.ts`**
- Disallow admin, api, next, checkout, cart, account, order, search, design-system, for every market prefix.
- Lists the sitemaps.
- Vercel previews send `X-Robots-Tag: noindex`.

**Sitemaps**
- `generateSitemaps()` per market (≤ 50k URLs each) for products, categories, collections, pages and posts.
- `lastModified` and `alternates.languages`, listed in `robots.ts`, revalidated by tag.

**JSON-LD**
- Serialized safely and typed with `schema-dts`.

| Page | Schema |
|---|---|
| Home | `Organization`, `WebSite` + `SearchAction` |
| PDP | `Product` + `Offer` (market currency, as-is, real availability, `priceValidUntil`) + `AggregateRating` (real reviews only) + `BreadcrumbList` |
| PLP | `CollectionPage` + `ItemList` + `BreadcrumbList` |
| Posts | `Article` |
| FAQ block | `FAQPage` |

**OG images:** localized Payload image, then the product thumbnail, then a generated `opengraph-image.tsx`.

**Status codes:** `notFound()` before any Suspense boundary, so missing pages return a real 404, and the catalog pages export `ensureStatic = "navigation"` (ADR 0004): without it, a page that was never rendered answers 200 at first, for a missing product and during an outage alike. A catalog page that cannot be rendered because the backend is down answers 5xx, never a 200 error page, and a page already rendered is served stale. The body of such a 404 or 500 is Next's bare error shell: the status and `noindex` are in the response, and the not-found page or the error state renders after hydration. That is a recorded limitation; check `curl` on a missing product on each minor bump of `next`. Root files that nothing serves (`/robots.txt` before M7's `robots.ts`, `/wp-login.php`) answer a plain-text 404 before `[market]` (§8.1, D54). Redirects are 301/308 from Payload. No IP-based redirects.

**Crawlability:** `<a href>` pagination and facets. More than 2 facets → `noindex,follow`.

**Content:** H1 = product name, required localized alt text, rich Payload descriptions.

---

## 13. Accessibility and performance budgets

**Accessibility (WCAG 2.2 AA)**
- axe-core in CI (the `design-system` job, §14) on every DS entry outside Foundations (the atoms, molecules, organisms, headers and footers: 114) at 375, 768 and 1440 px in two locales, `en` and `el`, and on every overlay's open state (D45), with the WCAG 2.2 A and AA rules and none disabled. Key routes follow with the pages they test. German and Greek long strings are covered by every atom's, molecule's and organism's component tests (the shared helper renders `de` and `el`); French is covered by the dev-console check, which opens an atom page in all four locales, and by W3's review.
- Every interactive atom is at least 44 × 44 px at every width (D32). Checkbox, Radio and Switch keep the kit's drawn size and get a 44 × 44 clickable area; a link inside a sentence is exempt.
- The token build checks contrast and fails below 4.5:1 for text and 3:1 for UI (the pairs are §9.2's). It composites translucent colours first and lists the pairs it checks. shadcn's neutral defaults fail three of them, and where the kit fails too, the override is ours, in `shopblok.tokens.json`.
- Focus management in drawers and dialogs: focus moves in, Tab stays in, Escape closes and focus returns, and the page behind is inert while a dialog is modal (component tests, and the `design-system` job's interaction check from the keyboard, D45). The toast and tooltip providers sit in one `Providers` component at every root layout.
- Mega menu rules (open on hover or keyboard, full width, stays open over trigger or panel).
- Radio semantics for variants; a skip link; `aria-current`.
- Correct `lang` attributes.
- No autoplay when the user prefers reduced motion: carousels never move by themselves, announcement bars and other rotating content do not rotate and have a pause control, and the DS checks run with reduced motion (D50).

**Performance (p75, mobile)**

| Metric | Budget |
|---|---|
| LCP | < 2.5 s |
| INP | < 200 ms |
| CLS | < 0.1 |
| First-load JS (PLP/PDP) | ≤ 170 KB gz. Messages split per route and locale |
| LCP image | `preload` / `fetchPriority="high"`, AVIF/WebP, `sizes` |
| Below-fold images | `loading="lazy"`, ≤ 500 KB on mobile |
| Fonts | Inter via `next/font/google` (D28), served from our own origin, subsets Latin + Latin-ext + Greek, the variable font, `display: swap`, `preload: false` so that a Greek page loads the Greek file and an English page does not. Next downloads the files at build time (and in `next dev`) from `fonts.googleapis.com` and `fonts.gstatic.com`, and a failed download fails the build; CI, Vercel and a PC reach them, and the cloud environment allows both (G5) |

Lighthouse CI runs on Vercel previews.

---

## 14. Testing and CI

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest (storefront, packages, `scripts/`) | Resolvers, price formatting per locale, variant selection, registry integrity, **market resolution + URL builder + hreflang**, CSP builder, the `markets` global's filter and save hook, `locales.ts` against the newest migration's enum, the token build against the committed `tokens.css` and `tokens.ts` |
| Component | Vitest + Testing Library on happy-dom (`packages/ui`) | Each atom's, molecule's and organism's role and name, focus, disabled and invalid states, keyboard use, the 44 px classes, and a long German and Greek label; a scan of `src/atoms/`, `primitives/`, `molecules/` and `organisms/` fails on a physical class, a colour literal, a `dark:` variant or a ring drawn at an alpha |
| Backend | `@medusajs/test-utils` with **Jest** (D14: Medusa's test helpers are Jest-only; the rest of the repo uses Vitest) | Payload sync (incl. markets), search provider per locale (ADR 0002's acceptance suite), notification provider per locale, saved-payment-method routes (ownership), region-enable script, verification enforcement. In CI today: `search-locale-assumptions.spec.ts`, the Medusa behaviour ADR 0002 rests on |
| E2E | Playwright | M0 suites, in `e2e-smoke` against a production build after `pnpm bootstrap --ci`: `markets` (URLs, redirects, the proxy), `wiring` (language, region, currency, prices per market), `payload-admin` (login, a page in two languages, media, the list view, a clean console), `payload-cache` (ADR 0001: cache hit, tag revalidation, 200-request draft isolation) and `payload-locales` (ADR 0003: the admin's selector follows `markets`); M1 adds `styles-fonts` (Inter's subsets, the token colours) and `dev-console` (the storefront's routes in `next dev`, below). Later: keyless purchase in **CY (`/`) and US (`/us/`)**; `/cy/` → `/` redirect; CH language switch (`/ch/` ↔ `/ch/fr/`) keeps the cart; sign-up → verify → login (link read from the console provider); Stripe test mode with a saved card when keys exist; CMS: build → translate → publish per locale, live preview, redirect, header/footer switch; adding a market through settings |
| Visual | Playwright (`toHaveScreenshot`) | M1: screenshots as CI artifacts with no baselines (D38). **From M2: committed pixel baselines** of every DS cell outside Foundations at 375, 768 and 1440 px in `en` (342 cells; the `el` cells keep their other checks, D51's fallback, chosen 2026-10-19), made only in Playwright's container (`mcr.microsoft.com/playwright:v1.64.0-noble`), with Playwright's defaults (threshold 0.2, no differing pixel), animations off, the clock fixed and fonts and pictures settled; and the 21 thumbnails, which are their previews' baselines. Not Git LFS. A `workflow_dispatch` input `update-baselines` rewrites them in a job of its own and says CI must be run again by hand |
| a11y | axe-core (`@axe-core/playwright`) | Every DS entry outside Foundations × 3 widths × `en`, `el` (684 cells, M2), and every overlay's open state; key routes later |
| Perf | Lighthouse CI | Budgets on Vercel previews |
| i18n | Script | Code catalogs cover every `ui-strings` key |

**CI (GitHub Actions)** (`.github/workflows/ci.yml`; SETUP.md, "CI (T16)" and "CI for M2 (T27)" have the timings). Six jobs, and the `update-baselines` job of a dispatch:
1. `check` (Node 22 required, Node 24 informational): install, `check:workspace`, typecheck, lint, unit tests, build. No `.env`, no database.
2. `backend-integration`: the backend's integration tests on the compose Postgres.
3. `e2e-smoke`: compose services up with `docker compose up -d --wait` (not `services:`: service containers start before checkout, so the init SQL under `infra/` could not be mounted), `pnpm bootstrap --ci`, a production build, Medusa and the storefront started directly, the Playwright suites above, `pnpm run doctor --json` (every third-party integration on its fallback, `ok` true) and `--online`. Its last step (D37) stops `next start` by PID, starts `next dev` and runs the `dev-console` project over the storefront's own routes (the DS pages are the `design-system` job's, item 4), with the console rules of `payload-admin.spec.ts`; anything excused is upstream, named by its exact text and route, and the Payload admin stays out (ADR 0001). From M3 on, `e2e-smoke` starts Medusa before `pnpm build` (ADR 0004, reading 4) and runs the outage test: Medusa stopped by PID gives the last good page, a 5xx for a page never rendered, a real 404 for a missing one, and 503 from `/next/status`.
4. `design-system` (D34, D51): Ubuntu in Playwright's container, Node 22, no compose and no `.env`. It builds the storefront with `DESIGN_SYSTEM_ENABLED=true`, starts `next start`, and runs the `design-system` Playwright project over every entry outside Foundations: 114 entries × 375, 768, 1440 px × `en`, `el` is 684 cells, each with axe, no overflow or clipped text outside `data-truncate`, 44 × 44 px targets and an empty console, and in `en` a pixel comparison; the interaction checks (every overlay opened from the keyboard at 375 and 1440 px, with axe and the focus checks on the open state, D45) and the `thumbnails` project; then it starts `next dev` for the DS pages' `dev-console` check (D53). It uploads the report with the expected, actual and diff images of every cell that differs. A build without the flag stops the suite at once with a message that says so. It is not a required check yet: branch protection is available since the repository went public (2026-10-22) and is not turned on; SETUP's G3 outcome, item (d), lists the checks to require.
5. `gate` (D53; `windows-gate` grown up): decides per PR which of `e2e-smoke`, `design-system` and `windows-smoke` run, from the PR's changed files, with `scripts/ci-gate.ts` (Node's built-ins only, so the job is a checkout, `setup-node` and the script, with no install). Both rules fail open: a job is skipped only when every changed file is on a list known not to affect it. Pushes to `main`, the schedule and a dispatch run `e2e-smoke` and `design-system`; `windows-smoke` keeps its rule.
6. `windows-smoke`: install, `check:workspace`, typecheck, the unit tests, build and the one-`^C` check of `pnpm dev` (`dev-ctrl-c.ps1`) on a Windows runner, weekly, on request, and on PRs that change a dependency file.

Later: Lighthouse on the Vercel preview (M7).

Also: Renovate (`renovate.json` groups Medusa, Payload and Next, so `e2e-smoke` and `backend-integration` run on those PRs, and holds back the majors that earlier decisions rule out), `pnpm audit` (a warning in M0, not a gate), secret scanning (a repository setting).

**Test rule (T16):** an assertion on `Intl` output compares what the project controls (symbol side, decimal mark, currency) and normalises what CLDR decides. A runner's newer Node 22 writes a different Swiss grouping mark than Node 22.22.0, and a test that pinned the old one failed in CI only.

---

## 15. Environment variables (outline)

**Backend (Railway)**

| Group | Variables | Notes |
|---|---|---|
| Core | `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `MEDUSA_BACKEND_URL`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | |
| Infra | `REDIS_URL`, `MEDUSA_FF_CACHING`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `MEILISEARCH_INDEX_PREFIX` | |
| R2 | `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FILE_URL` (public domain) | The apps' examples and `doctor` call it `S3_PUBLIC_URL`; M6 settles one name |
| CMS link | `PAYLOAD_SERVER_URL`, `PAYLOAD_API_KEY`, `PAYLOAD_USER_COLLECTION=integrations`, `STOREFRONT_URL`, `REVALIDATE_SECRET` | |
| Added later | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` | |
| Added later | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | |
| Added later | `POSTHOG_EVENTS_API_KEY`, `POSTHOG_HOST` | |
| Added later | `SENTRY_DSN` | |
| Production | `MEDUSA_WORKER_MODE`, `DISABLE_MEDUSA_ADMIN` | |
| Development | `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD` | Written by `pnpm bootstrap`; the Payload admin uses the same login. A plain-text development password in a git-ignored file: never use real credentials with bootstrap |
| Local stack | `POSTGRES_PORT`, `REDIS_PORT`, `MEILI_PORT` | Compose's host ports (§5); change the apps' URLs with them |

**Storefront (Vercel)**

| Group | Variables | Notes |
|---|---|---|
| Medusa | `MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_URL` | The key is baked in by `next build`, so a new key needs a new build. `NEXT_PUBLIC_BASE_URL` is also the address the proxy fetches the market map from, so the server must reach it itself |
| Payload | `PAYLOAD_DATABASE_URL` (pooled), `PAYLOAD_SECRET`, `PREVIEW_SECRET`, `CRON_SECRET`, `REVALIDATE_SECRET`, `PAYLOAD_DB_PUSH` (default `false`) | |
| R2 | `S3_*` (media bucket), `S3_PUBLIC_URL` | |
| Added later | `NEXT_PUBLIC_STRIPE_KEY` | rebuild |
| Added later | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | |
| Added later | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | rebuild |
| Added later | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | rebuild |
| Flags | `DESIGN_SYSTEM_ENABLED` | Read at build time and frozen into the bundle (`next.config.ts`'s `env`), so setting it on `next start` changes nothing; listed in turbo's `build` env in `apps/storefront/turbo.json`, so that a build with it is never replayed for one without. `next dev` always serves the DS (§9.6) |
| CI only | `E2E_TEST_ROUTES` | Opens the test-only routes under `/next/e2e`; only `e2e-smoke` sets it. Never set it on a production deployment (a preview used for M7's checks is the exception) |

Markets are **data** (Medusa + the Payload `markets` global), not env. The base language (`en`) is a Payload config constant set once per brand.

---

## 16. Go-live checklist: API keys added last

Every key is optional at boot. Public (`NEXT_PUBLIC_*`) keys need a Vercel redeploy.

1. **Infrastructure** (`docs/DEPLOY.md`)
   - Railway: server, worker, Postgres, Redis, Meilisearch; a staging environment.
   - Vercel: a project with environments paired to Railway, Vercel Cron, market domains.
   - R2: buckets per environment, a custom domain (on Cloudflare DNS), CORS.
   - Run `pnpm bootstrap --no-demo` on staging, then production (the demo seed refuses to run in production). Deploy Payload's saved migrations before the code that needs them. Run a full reindex.
2. **Resend** (do this before opening sign-ups, since verification is required): verify the domain (SPF, DKIM, DMARC), add the keys, send test emails in every locale.
3. **Stripe**
   1. Add the keys.
   2. Create the webhook.
   3. Run `enable-stripe-regions`.
   4. In the Dashboard, enable cards, Apple Pay, Google Pay, **Revolut Pay** and any local methods.
   5. Register Apple Pay / Google Pay domains (main + market domains).
   6. Test with a saved card and Revolut Pay in test mode, then go live.
4. **PostHog:** EU project and keys. Check that events only arrive after consent.
5. **Sentry:** projects, the Vercel integration, DSNs and auth token. Switch the CSP from report-only to enforced after a clean week.
6. **Secrets:** fresh secrets for each environment.
7. **SEO:** HSTS preload; robots open in production only; submit each market's sitemap in Search Console; check the hreflang report; run the Rich Results Test.
8. **Redeploy the storefront.** `pnpm run doctor --strict --online` should be all green (`--strict` makes a warning fail).

---

## 17. Milestones and risks

### 17.1 Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | **Foundation**: monorepo, compose, backend from dtc-starter, Next 16.4 + Payload 3.90 shell, market resolution + proxy rewrite, `bootstrap`/`doctor`, CI. **Spikes:** Cache Components × Payload admin; Search Module per-locale indexing; Payload locale preloading with `filterAvailableLocales` | Everything boots wired together with no keys; spike ADRs written (0001 to 0003, accepted 2026-10-10; the Windows exit check closes M0) |
| M1 | **Design foundations** (built 2026-10-15 to 2026-10-16; W3 closes it): the full Figma variable export → tokens (light only, `pnpm tokens`, the contrast gate), the 32 atoms, the DS page shell (viewport and locale switchers, fixtures, the build flag), the `design-system` CI job, the `dev-console` step, and spike S4 | All 32 atoms × 3 widths × `en` and `el` (192 cells), contrast green (36 pairs); the storefront's own routes clean in `next dev` (ADR 0001); where the catalog pages' data lives: in the static shell (ADR 0004, accepted: S4 passed, §8.1 and §12) |
| M2 | **Molecules + organisms + registry** (built 2026-10-17 to 2026-10-22; W4 closes it): `@shopblok/registry` with the view-model contracts, copy in ICU, 22 primitives, 40 molecule entries, 31 organisms, Header 6, Footer 5 and ProductCard 10 (122 DS entries with Foundations), the thumbnail generator, pixel baselines (D38, D51) and the CI gate | Registry drives the DS page, its checks and the thumbnails (it replaces M1's manifest): 684 cells with no axe violation, overflow, small target or console message, every overlay checked open from the keyboard, the `en` cells with committed baselines (English only, D51's fallback) and the 21 thumbnails at their registry paths. Per-visitor parts for catalog pages, the header's cart count included, are Client Components that read in the browser (ADR 0004); a root file nothing serves answers a plain-text 404 |
| M3 | **Commerce core**: DAL, markets/i18n (next-intl on `intl-messageformat` 11), the visitor store's sources (a route handler that reads the cart cookie) and the forms' server actions (zod, errors handed back; `Address.city` for the seven countries without a city field), search-backed PLP, PDP, cart, 3-step checkout (system payment), confirmation, account with **required email verification** (the four backend pieces of §8.4), password reset; the Postgres search index (A′), its transform, the `/store/search` locale middleware and the `translation.*` events (ADR 0002); UI text for any language an owner enables; the home, PDP and PLP built to ADR 0004 (`ensureStatic = "navigation"`, `generateStaticParams` with a build stand-in, a long `expire` with tags, `e2e-smoke` starting Medusa before `pnpm build`, an outage test) and `/next/status` | Keyless E2E in US and CY passes |
| M4 | **CMS**: collections, globals (incl. `markets`, `ui-strings`, `email-templates`), blocks, localization, sync (products, categories, collections, markets), live preview, drafts, scheduling, SEO, redirects, forms, revalidation (content reads take their locale from the market map, not from the request; the first collection with an upload field brings back S1's media-drawer check); CMS pages and posts read in the static shell like the catalog (ADR 0004; their stand-in rule is D10's); the matching Payload block schema on each DS entry; the `header` and `footer` `design` pickers and blocks' `variant` read `variantsOf()` with its thumbnails | Editor builds, translates and publishes the homepage; adds a market from settings |
| M5 | **Section library**: all blocks × variants | On the DS page and selectable in Payload |
| M6 | **Integrations**: Stripe (Payment Element, **saved methods**, Apple Pay, Google Pay, **Revolut Pay**), Resend + localized emails, PostHog + consent, Sentry ×3, Meilisearch provider (one index per locale, with the changes ADR 0002 lists), Redis modules, **R2** | Each turns on purely via env; `doctor`'s `wired` flags flip |
| M7 | **Hardening + deploy**: CSP, headers (including `withPayload`'s `Vary`, `Accept-CH` and `X-Powered-By` on every route, and `x-middleware-rewrite`), `robots.ts` disallowing `design-system`, the DS page's Payload-login gate (replacing M1's build flag), sitemaps, hreflang, JSON-LD, OG, a11y/perf; uptime monitors on `/next/status`; Vercel + Railway + R2 staging; docs | Audits green on staging; ADR 0001's three checks green on a Vercel preview (`payload-cache.spec.ts` with `E2E_BASE_URL` and `E2E_TEST_ROUTES=true` on the preview only); ADR 0004's outage and expiry checks repeated there, because Vercel's cache is not the one measured |
| M8 | **Optional**: reviews, wishlist, comparison, Express Checkout Element | n/a |

### 17.2 Risks

| Risk | Mitigation |
|---|---|
| Payload × Cache Components "not guaranteed" | Validated by ADR 0001: kept on, production mode clean, `next dev` logs console errors in the admin, not tested on Vercel (M7); CI runs the cache, tag and draft checks; `unstable_cache` fallback kept in the ADR |
| Search Module is new; no official Meilisearch provider; per-locale indexing undocumented | Validated by ADR 0002; the Medusa defects it found are listed there and guarded by `search-locale-assumptions.spec.ts`; Postgres fallback; env-gated provider |
| Translation Module is behind a feature flag | Pin Medusa; e2e in 2 locales; fallback to default strings |
| Payload locales are fixed at startup | Validated by ADR 0003: 42 languages preloaded, `filterAvailableLocales` for the admin, locales only grow, a language outside them is one line and one migration deployed before the code |
| Email verification enforcement may not be native in Medusa | Server-side check in the login action and auth flow; e2e test; verify in M3 |
| Saving Revolut Pay / non-card methods via Medusa's Stripe provider | Verify in M6; cards-only saving as a fallback |
| R2 public access is per bucket (private Medusa files) | WAF rule on the public domain or a second bucket; verify in M6 |
| R2 custom domains need Cloudflare DNS | Document in DEPLOY; `r2.dev` for dev only |
| Medusa × Payload guide is old (Payload 3.54) and has insecure access | Architecture only; hardened access; `@payloadcms/sdk` |
| Medusa 2.21 Store API field allow-list | `allowFields` + e2e |
| Vercel 4.5 MB body cap | `clientUploads` |
| Serverless Postgres connections | Pooled URL, small pool |
| Sentry backend guide stuck on v7 | Current SDK + `registerOtel` |
| Payload v4 (Node 24, access default flips) | Explicit `overrideAccess`; Node 24 in the CI matrix |
| Next advisories (`next/og`; the six of 2026-09-30; the two RCEs and one DoS of 2026-10-24) | Pin 16.4.1 exactly; Renovate opens a PR per release and CI tests it |
| pnpm 12's Rust port is called "not production ready" by pnpm's own `SECURITY.md`; Corepack cannot run it | Installed, built and hot-reloaded on Windows and Linux in M0; fallback pnpm 11.28; Corepack off is a documented prerequisite |
| ESLint 9 is end of life (2026-08-06) and the Medusa plugin and `eslint-config-next` stop at 9 | Stay on 9.39.5; Renovate holds the major; revisit when the plugin allows 10 |
| Payload's CLI (`migrate`, `run`) exits 0 without doing anything in about 1 run in 20 | `bootstrap` and `doctor` repeat a silent run up to three times; the upstream issue still has to be filed |
| `node_modules` paths reach about 300 characters on Windows | `LongPathsEnabled=1` is a prerequisite; W2 checks it |

---

## 18. Decisions on the open questions

**Confirmed 2026-10-08**

| # | Topic | Decision |
|---|---|---|
| Q24 | URL scheme | Primary country at `/`, others at `/{country}/`, extra languages at `/{country}/{lang}/`, optional per-country domains |
| Q28 | Primary country | **Cyprus** (Greek) at `/`; English base language; x-default → `/us/` |

**Defaults accepted (2026-10-08)**

| # | Topic | Decision |
|---|---|---|
| Q4 | Payload placement | Embedded |
| Q5 | Categories / collections | Synced into Payload |
| Q6 | Commerce template variants | `templates` global |
| Q7 | Theming | Code tokens per brand + optional primary/radius override |
| Q8 | DS page | Gated in production (by a build flag until M7 adds the Payload login, D33); no Storybook |
| Q9 | Reviews, wishlist | M8; Q&A, gift cards, store locator, lookbook in v1.1 |
| Q10 | Editorial | `posts` collection |
| Q11 | Newsletter / free shipping | Resend Audiences (env-gated); threshold from Medusa |
| Q13 | Object storage | **R2 everywhere** (user decision) |
| Q14 | Cache Components | Yes (ADR 0001, accepted 2026-10-10) |
| Q15 | Search | Meilisearch Search provider; products only. One index per locale on Meilisearch, one multilingual index on Postgres (ADR 0002) |
| Q16 | Checkout | Guest on; saved cards; Apple Pay, Google Pay, Revolut Pay (user decision) |
| Q17 | Account | Email verification required (user decision); returns + guest lookup in v1 |
| Q18 | Privacy | EU PostHog host, replay off, 3 consent categories |
| Q19 | Sentry backend | Adapt to the current SDK |
| Q21 | Payload version | 3.90 now, v4 when stable |
| Q22 | Dark mode | None (user decision) |
| Q23 | Name | Shopblok Starter (user decision) |
| Q25 | Localized layouts | Shared structure; opt-in per page |
| Q26 | Languages / auto-translation | en, de, fr, el. No auto-translation (Medusa doesn't offer it) |
| Q27 | UI microcopy | **Changed:** editable in Payload `ui-strings`, seeded from code catalogs, so new languages can be added in settings |

---

## 19. Sources

**Medusa**
- dtc-starter: https://github.com/medusajs/dtc-starter
- Payload guide: https://docs.medusajs.com/resources/integrations/guides/payload · example: https://github.com/medusajs/examples/tree/main/payload-integration
- Translation Module: https://docs.medusajs.com/resources/commerce-modules/translation · Admin translations: https://docs.medusajs.com/user-guide/settings/translations · Announcement: https://medusajs.com/blog/introducing-experimental-translations
- Saved payment methods: https://docs.medusajs.com/resources/how-to-tutorials/tutorials/saved-payment-methods
- Stripe: https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe · https://docs.medusajs.com/resources/nextjs-starter/guides/customize-stripe
- Resend: https://docs.medusajs.com/resources/integrations/guides/resend
- PostHog: https://docs.medusajs.com/resources/infrastructure-modules/analytics/posthog
- Sentry: https://docs.medusajs.com/resources/integrations/guides/sentry
- Search Module: https://docs.medusajs.com/resources/infrastructure-modules/search · provider reference: https://docs.medusajs.com/resources/references/search/provider
- S3 file provider: https://docs.medusajs.com/resources/infrastructure-modules/file/s3
- Deployment: https://docs.medusajs.com/learn/deployment/general
- pnpm with Medusa: https://docs.medusajs.com/learn/configurations/pnpm

**Stripe**
- Revolut Pay: https://docs.stripe.com/payments/revolut-pay

**Next.js 16.4**
- CSP: https://nextjs.org/docs/app/guides/content-security-policy
- Data security: https://nextjs.org/docs/app/guides/data-security
- Metadata: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Sitemaps: https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps
- JSON-LD: https://nextjs.org/docs/app/guides/json-ld
- Caching: https://nextjs.org/docs/app/getting-started/caching
- Advisory: https://nextjs.org/blog/nextjs-security-update-september-22-2026
- September 2026 security release: https://nextjs.org/blog/september-2026-security-release
- 16.4: https://nextjs.org/blog/next-16-4
- The docs bundled with the installed Next (read on 16.4.0 on 2026-10-16; 16.4.1 since 2026-10-24) (`node_modules/next/dist/docs/`): fonts (`01-app/01-getting-started/13-fonts.md`), `generateStaticParams` and the Cache Components migration guide (`01-app/03-api-reference/04-functions/generate-static-params.md`, `01-app/02-guides/migrating-to-cache-components.md`), `ensureStatic` and `cacheLife` (ADR 0004 lists the pages)

**Payload 3.90**
- Localization (`filterAvailableLocales`): https://payloadcms.com/docs/configuration/localization
- Plugins: https://payloadcms.com/docs/plugins/overview
- Live preview: https://payloadcms.com/docs/live-preview/server
- storage-s3 (`clientUploads`): https://cdn.jsdelivr.net/npm/@payloadcms/storage-s3@3.85.1/README.md
- Website template: https://github.com/payloadcms/payload/tree/v3.90.2/templates/website
- Migrations: https://payloadcms.com/docs/database/migrations
- Cache Components: PR #16020 and issue #18065 (github.com/payloadcms/payload)

**Tooling**
- pnpm 11 (the `.npmrc` change): https://pnpm.io/blog/releases/11.0 · pnpm 12: https://pnpm.io/blog/whats-different-in-pnpm-12 · supported versions: https://github.com/pnpm/pnpm/blob/main/SECURITY.md
- Turborepo (the schema moved): https://turborepo.dev/schema.json
- Meilisearch `localizedAttributes`: https://www.meilisearch.com/docs/reference/api/settings/get-localizedattributes

**International SEO (Google Search Central)**
- Multi-regional sites: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Locale-adaptive pages: https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages

**Hosting**
- Vercel 4.5 MB limit: https://community.vercel.com/t/4-5-mb-payload-limit/10500
- Railway Buckets (not used, private-only): https://docs.railway.com/storage-buckets

**Design and licensing**
- ReUI license: https://reui.io/legal/license · ReUI MIT repo: https://github.com/keenthemes/reui · ReUI registry: https://www.reui.io/docs/registry
- Figma kit (CC BY 4.0): https://www.figma.com/community/file/1649373313065184861/shadcn-ui-design-system-by-reui
- Figma MCP server rate limits: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/ · REST variables (Enterprise only): https://developers.figma.com/docs/rest-api/variables/
- shadcn/ui: `components.json` https://ui.shadcn.com/docs/components-json · monorepo https://ui.shadcn.com/docs/monorepo · changelog (Base UI as the default, July 2026; CLI v4) https://ui.shadcn.com/docs/changelog · Base UI https://base-ui.com
- Design tokens (DTCG Format Module 2025.10): https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/ · Style Dictionary: https://styledictionary.com/reference/hooks/parsers/ · https://styledictionary.com/reference/api/ · https://styledictionary.com/info/dtcg/
- Simple Icons disclaimer: https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md
- Tailwind CSS (source detection, theme): https://tailwindcss.com/docs/detecting-classes-in-source-files · https://tailwindcss.com/docs/theme
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- shadcnspace license: https://shadcnspace.com/license
- M2 (checked 2026-10-16 and 2026-10-17): shadcn CLI (`add --path`, `--dry-run`) https://ui.shadcn.com/docs/cli · ReUI `stepper` and `timeline` https://reui.io/r/base-vega/{stepper,timeline}.json · embla-carousel-react https://www.npmjs.com/package/embla-carousel-react · intl-messageformat https://www.npmjs.com/package/intl-messageformat · the address data: `lib-address` https://github.com/LancelotP/lib-address over Google's AddressValidationMetadata https://github.com/google/libaddressinput/wiki/AddressValidationMetadata (compared with `localized-address-format` and `@piplup/libaddressinput`, SETUP "D48: where the address formats come from") · Playwright https://playwright.dev/docs/test-snapshots · https://playwright.dev/docs/docker · https://playwright.dev/docs/clock · Next 16.4's rewrites page (`01-app/03-api-reference/05-config/01-next-config-js/rewrites.md` in the bundled docs)
