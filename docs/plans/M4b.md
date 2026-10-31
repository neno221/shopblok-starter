# M4b plan: markets in Medusa

**Status:** written 2026-10-31 at your request ("the settings for the country, language, etc. I would like to be able to set via the Medusa dashboard panel, not via Payload. Payload should only act as the CMS and site builder. Create a Medusa block. Use the Medusa dev plugin"). **You approved the scope as proposed on 2026-10-31**, with one rule added: no duplicate features or look-alike screens next to Medusa's own, and a country is chosen in one place only (Medusa's region form). D90 to D93 follow that rule: the settings hang off Medusa's Region and Store pages as panels, and there is no separate Markets page or country picker.

> **M4b:** the market map (which countries are open, each country's languages and default language, the Medusa locale of each language, `<html lang>`, the time zone, a country's own domain, the primary country and the fallback market) moves from Payload's `markets` global into a Medusa plugin whose panels sit on Medusa's own Region and Store pages. The storefront reads it from Medusa. Payload keeps content only.
> **Done when:** an admin opens Austria entirely in Medusa Admin (adds it to the Europe region in Medusa's own region form, then switches it on with German in the Markets panel on that region's page) and `/at` answers in German with EUR prices; Payload has no `markets` global, and nothing in the sync, doctor or bootstrap reads one.

Paths are relative to the repo root. Numbers continue from M4 (decisions from D89, tasks from T73); W6 keeps its number and runs after M4b (§4). Facts below were checked on 2026-10-31 against this checkout (Medusa 2.21.2, Payload 3.92.1, Next 16.4.3), the Medusa docs (§7) and the installed and latest (2.22.2) `@medusajs/*` sources.

---

## 0. What I need from you

1. ~~The scope~~: approved as proposed on 2026-10-31, with the rule that nothing duplicates what Medusa already has and a country is chosen in one place only.
2. Nothing else blocks the start. W6 (the Windows check and editor review) waits until T76, because its editor review would otherwise check the Payload Markets page that M4b removes.

---

## 1. What is where today, and what moves

| Setting | Edited today | After M4b |
|---|---|---|
| Regions: countries, currency, taxes, payment, shipping | Medusa Admin → Regions (seeded from `apps/backend/src/config/markets.ts`) | unchanged |
| Store currencies and locales | Medusa Admin → Store (seeded from the same file) | unchanged |
| Which countries exist | Medusa Admin → Regions (countries) **and** Payload → Markets (a second country list) | **Medusa Admin → Regions only**: a country in a region is a market, closed until switched on |
| Open or closed, languages (default first), domain, time zone | Payload → Markets (admins) | **the Markets panel on each region's page** in Medusa Admin |
| Language → Medusa locale, `<html lang>` override | Payload → Markets | **the Markets panel on the Store page** (the languages are the store's own locales) |
| Primary country (`/`), fallback market (x-default) | Payload → Markets | **the Markets panel on the Store page** |
| `markets.synced` (Payload's read-only copy of regions and locales) | written by the sync | **removed**: the checks read Medusa directly |
| Payload's language picker (the content languages shown) | follows `markets` in Payload | follows the open markets read from Medusa |
| Payload's 42 content languages (`payload/locales.ts`) | code, migration to add one | unchanged (code; the plugin checks against the same list) |

Medusa 2.21.2 and 2.22.2 have no market, no time zone and no default locale on the store, region or country (the store has `supported_locales` with `locale_code` only), so these settings need a module of our own; regions and store locales stay Medusa's own.

---

## 2. Decisions

| # | Decision | What it means and why |
|---|---|---|
| D89 | **A workspace Medusa plugin, `@shopblok/medusa-markets`, in `packages/medusa-markets/`.** Made the way `create-medusa-app --plugin` makes one: `src/{modules,api,admin,workflows,subscribers}`, `package.json` with the `exports` map the docs give (`./admin`, `./workflows`, `./.medusa/server/src/modules/*`, `./*`), the `@medusajs/*` packages as peer and dev dependencies at the backend's exact pins (2.21.2, `@medusajs/ui` 4.2.6), `@swc/core` as a dev dependency. **Built with `medusa plugin:build`** (turbo `build`; the backend depends on it with `workspace:*`, so `^build` builds it first, also before `medusa develop` through a `dev` dependency). Medusa loads a plugin from `<package>/.medusa/server/src` and turns its admin on only when `exports["./admin"]` exists (`@medusajs/utils` `get-resolved-plugins`), so a workspace link works without Yalc. **Development:** `medusa plugin:develop` is the docs' watch mode, but it republishes to Yalc and `plugin:add` would replace the `workspace:*` link with a `file:.yalc` one; T73 measures whether `plugin:develop` in the package (its rebuild of `.medusa/server`) is picked up by the backend's `medusa develop` through the link, and `pnpm dev` runs it if so, or `plugin:build --watch`-style rebuilds otherwise; SETUP.md records which. Registered in `apps/backend/src/config/config.ts` as `plugins: [{ resolve: "@shopblok/medusa-markets", options: {} }]`. Not published to npm (it can be later: `plugin:build` then `npm publish`) | You asked for a plugin. A plugin keeps markets in one package with its module, routes, workflows and admin pages, so another Medusa app could take it whole. **Alternative:** the same code inside `apps/backend/src` (a module, routes and admin pages), with no build step, but no plugin |
| D90 | **The `markets` module and its data; Medusa's own data first.** **No second country list:** a market's country is a country in a Medusa region, chosen only in Medusa's region form; Medusa already puts a country in at most one region, so the region and its currency come from the country with Query, and there is no module link (it would copy that). Three models hold only what Medusa has no field for: `market_country` (`code`, unique, the key to the region's country; `enabled`, **false by default**, so a country just added to a region is a closed market until it is switched on; `languages`, a text array of ISO 639-1 codes, the default first; `domain`, nullable and unique; `time_zone`, nullable, IANA), `market_language` (`code` ISO 639-1, unique; `medusa_locale`, one of the store's locales; `html_lang`, nullable) and `market_settings` (one row: `primary_country`, `fallback_market`). **The languages are the store's locales:** a country's languages are picked from Medusa's Store → Locales (`de-DE` gives `de`), and a `market_language` row is filled for each language the first time it is used; when the store has two locales of one language (`de-DE`, `de-CH`), the Store page's panel says which one the shops use (D8: one Medusa locale per language). A `market_country` row whose country leaves every region is kept but left out of the map, so putting the country back restores its settings. The service (`MedusaService`) gets `getMap()`, which returns `@shopblok/fixtures`' `MarketMap` shape exactly (countries in a region with a row, ordered by region and code), so the storefront's types and its 14 test files on the map stay as they are. Migrations with `medusa plugin:db:generate`, applied by the backend's `db:migrate` (bootstrap runs it) | You asked for one place per choice. Countries stay Medusa's (regions), languages stay Medusa's (store locales), and the module adds only the switches and fields Medusa lacks. **Alternative (dropped 2026-10-31):** the first draft's own country list on a Settings → Markets page, which duplicated the region's |
| D91 | **Checks on save, against live Medusa data.** Each save is a workflow (`saveMarketCountryWorkflow`, `saveMarketSettingsWorkflow`) that validates, writes and emits `shopblok.markets.updated`; its write step's compensation restores the previous rows. Refused, with the reason: a country in no region (only reachable through the API); an open country with no language; a language not among the store's locales; a language outside Payload's 42 (the list moves from `apps/storefront/src/payload/locales.ts` to `@shopblok/i18n`, which both sides import); a duplicate domain; an invalid time zone (`Intl`); closing the primary country or the fallback market's country; a primary country that is not open; a fallback market that is not an open country–language pair. These are today's `syncedMarketProblems` and `marketMapProblems`, moved. **Changed later in Medusa's own screens** (a region loses the primary country, a store locale a market uses is removed): Medusa's forms are not blocked, the Store page's panel shows a warning, and doctor fails | The checks read Medusa's tables directly, so the `synced` copy and its "warning while empty" phase go. **Alternative:** a subscriber that closes a market whose country leaves its region (surprising for the admin) |
| D92 | **Admin API and store API.** `GET /admin/markets` (the map, the regions with their currencies and countries, the store's locales, and the current warnings), `POST /admin/markets/countries/:code` (one country: `enabled`, `languages`, `time_zone`, `domain`) and `POST /admin/markets/settings` (`primary_country`, `fallback_market`, and each language's `medusa_locale` and `html_lang`), validated with zod from `@medusajs/framework/zod` in the plugin's `middlewares.ts`; admin session or secret key, Medusa's default for `/admin`. `GET /store/markets` returns `getMap()` and needs the publishable key like every `/store` route; the storefront already sends it. Closed countries are in the answer (the storefront's 404 for them needs to know them), as in `/next/markets` today | Each panel saves what it shows. Cross-row checks (primary, fallback, domains) run in the workflow against the stored rows |
| D93 | **The admin panels (the "Medusa block"): on Medusa's own pages, nothing beside them.** **On each region's page** (`zone: "region.details"`; zones have no `.after` since 2.17.2): a "Markets" panel listing the region's countries (the ones Medusa's region form chose), each with an Open switch, its languages (from the store's locales, reorderable, the first is the default), time zone (a select from `Intl.supportedValuesOf("timeZone")`) and domain, edited in a drawer. **On the Store page** (`zone: "store.details"`, beside Medusa's own Locales): a "Markets" panel with the primary country, the fallback market and, per language in use, its store locale and `<html lang>`, plus the warnings of D91. **No Settings → Markets page and no country picker**, since the region form already picks countries and Store → Locales already lists languages. `@medusajs/ui` and `@tanstack/react-query` through the admin's own copies (peers), Medusa's own drawer and table patterns, so the panels look like the page around them; the strings in an i18n namespace `markets` | Your rule (2026-10-31): a choice is made in one place, and the plugin extends Medusa's screens instead of copying them. **Alternative:** a read-only overview of all markets under Settings, if one list of every market turns out to be missed (not built unless you ask) |
| D94 | **The storefront reads the map from Medusa.** `lib/markets/payload-loader.ts` becomes `medusa-loader.ts` (`GET /store/markets` through the data layer's SDK, no locale header); `source.ts`, the 30 s in-process cache, the last good map, the fixtures fallback in development and `next build`, and `/next/markets` for the proxy stay as they are. The cache tag `global:markets` becomes **`medusa:markets`**, added to `/api/revalidate`'s allow-list; the backend's revalidation subscriber sends it with `expire: 0` on `shopblok.markets.updated`, and `region.*` events send it too (a region's countries decide which markets are open). The proxy still never imports Payload or the Medusa SDK (`proxy-imports.test.ts`). A saved map reaches the proxy within about 30 s, as T71 measured | Only the loader and the tag change, so the URL scheme, the switcher, hreflang and the e-mails' `{market, language}` metadata are untouched. **Alternative:** the proxy reads `/store/markets` itself, which would put the publishable key in the proxy |
| D95 | **Payload keeps content only.** The `markets` global, its `synced` group, its save check, `rememberEnabledLanguages`, `lib/markets/synced.ts`, `global.ts`'s mapping and `scripts/markets-data.ts` are removed, with a migration that drops the `markets*` tables and the two `enum_markets_*` types. `filterAvailableLocales` takes the open languages from the storefront's market map (`getMarketMap()`, now Medusa's) instead of the global. **The sync** stops carrying markets: `readMarkets`/`syncMarkets`/`writeMarkets`, `writePayloadMarketsStep`, the subscriber's `region.*` and `store.store-locale.*` → `markets` entries, `SyncExport.markets` and its import step go; products, categories and collections are untouched. **Bootstrap** seeds the markets module from `@shopblok/fixtures`' `markets` while it is empty (`seed-markets.ts`), instead of seeding the global. A dev database's edited Payload Markets is not carried over: nothing is in production, and bootstrap seeds the same six countries | You asked for Payload as CMS and site builder only. Dropping the tables in the same PR that stops reading them avoids a period with two editors. **Alternative:** keep the global as a read-only mirror filled by the sync (the card's second option) |
| D96 | **The time zone moves to Medusa.** `market_country.time_zone` replaces Payload's `timeZone` field; D76's "stays edited in Payload" is superseded. The seeded zones are the fixtures' six | It was in Payload only because Medusa had no field for it (D76); the plugin is that field |
| D97 | **Doctor and the done-when.** Doctor's `markets-sync` check becomes `markets`: it reads `GET /admin/markets` (or the module through `medusa exec` when offline) and reports the warnings of D91; `scripts/lib/markets-check.ts` compares the module with the regions and locales instead of Payload's two parts. **`markets-add.spec.ts`** drives Medusa Admin in the browser: Austria added to the Europe region in Medusa's region form, then switched on with German in the region page's Markets panel; `/at` answers in German with EUR and `lang="de-AT"` within 70 s, and `/de`'s hreflang lists it. `sync.spec.ts` loses its markets part; `payload-locales.spec.ts` opens a language through Medusa's API; `markets.spec.ts`'s 403 on `/api/globals/markets` becomes a 404 | The done-when is the same story as M4's, with the second half in Medusa |
| D98 | **Versions and process.** Medusa stays at 2.21.2 (2.22.2 came out on 2026-10-30; a bump is its own PR, D71's note). M4b runs like M4 (D88): one cloud task per PR, a code review in its own thread, must-fix findings fixed and optional ones only for security or cleanup, a merge commit on green CI | |

---

## 3. Tasks

### T73 · The plugin, the module and its API (cloud; backend)

**Goal:** D89 to D92 and D96: `packages/medusa-markets` builds, the backend loads it, the module's tables exist, the admin and store routes answer, bootstrap seeds the fixtures' map.

**Steps:**
1. Scaffold the package (D89); add it to the backend (`workspace:*`, `plugins` in `src/config/config.ts`); turbo builds it before the backend. Measure `plugin:develop` against the workspace link and wire `pnpm dev` (D89).
2. The module (D90): models, service with `getMap()`, migration from `plugin:db:generate`.
3. The save workflow with compensation and the checks (D91); Payload's 42 languages moved to `@shopblok/i18n` (Payload imports them from there; no migration, the values are the same).
4. Routes (D92) with zod validators; the event `shopblok.markets.updated`.
5. `seed-markets.ts` seeds the module from the fixtures while it is empty; `export-for-payload` and the Payload import untouched in this task.
6. Tests: unit (checks, `getMap()`), `integration-tests/http/markets.spec.ts` (a country added to a region appears closed, a save, refusals with reasons, compensation, `/store/markets` with and without the publishable key, `/admin/markets` without a session).

**Verify:** `backend-integration` green; `pnpm bootstrap` on a fresh database gives the six countries in `GET /store/markets`, equal to the fixtures. Mutations: a save that skips the region check accepts a country in no region and the test fails; a compensation that does nothing leaves the rows the failing step wrote.

### T74 · The admin panels (cloud; plugin)

**Goal:** D93: the Markets panels on the Region and Store pages.

**Steps:** the region panel with its drawer; the store panel; the `markets` i18n namespace; `src/admin/lib/sdk.ts` in the plugin. **Verify:** a Playwright spec against Medusa Admin (sign in as the seeded admin): add Austria to the Europe region in Medusa's own form and see it closed in the panel, open it in German, reorder Switzerland's languages, change a time zone, see a refusal's reason (closing the primary country), change the fallback market on the Store page; axe on both pages; the panels read only through the routes of D92.

### T75 · The storefront reads Medusa; Payload loses the markets (cloud; storefront, backend)

**Goal:** D94 and D95.

**Steps:** the loader and the tag; the allow-list; the backend's revalidation subscriber; `filterAvailableLocales`; the removals and the drop migration; the sync without markets (backend, fixtures' `SyncExport`, Payload import, bootstrap step 10); doctor (D97). **Verify:** unit tests on both sides; `e2e-smoke` with `markets.spec.ts`, `markets-switch.spec.ts`, `payload-locales.spec.ts` and `sync.spec.ts` updated; `pnpm build` with no `.env` (the fixtures' stand-in); `proxy-imports.test.ts`.

### T76 · The done-when, docs and SPEC v0.11 (cloud)

**Goal:** D97; SPEC v0.11 (§6.2, §7.3 without `markets`, §8.5's runbook "Adding a market" in Medusa only, D10/D17/D19/D76 marked superseded, the "Changes in v0.11" table); SETUP.md sections for T73 to T76; NEXT-SESSION with W6's prompt updated (the editor review adds a market in Medusa Admin).

**Verify:** `markets-add.spec.ts` in `e2e-smoke` green; every CI job green on the PR, `windows-smoke` started by hand.

---

## 4. Order of work

T73 → T74 → T75 → T76, one after another (each builds on the last; T74 and T75 could run side by side once T73 is merged). W6 after T76, when you say so.

## 5. Exit criteria

1. The done-when, in `e2e-smoke`.
2. Payload has no `markets` global and no `markets*` table; the sync carries products, categories and collections only.
3. The Region and Store pages' Markets panels work from the keyboard, with no axe violation; Medusa Admin has no second country picker.
4. `pnpm bootstrap` on a fresh database and `pnpm doctor` pass; `pnpm build` passes with no `.env`.
5. Every CI job green on T76's PR, `windows-smoke` included.

## 6. Out of scope

A market's name translated through Medusa's Translation Module (the storefront names countries with `Intl.DisplayNames`); the backend computing a market's URL prefix itself for e-mails (the storefront still sends it, D84); Medusa 2.22.x; publishing the plugin to npm.

## 7. Sources (checked 2026-10-31)

- Plugins: https://docs.medusajs.com/learn/fundamentals/plugins and `/plugins/create`; CLI: https://docs.medusajs.com/resources/medusa-cli/commands/plugin
- Admin: https://docs.medusajs.com/learn/fundamentals/admin/ui-routes, `/admin/widgets`, `/admin/translations`, `/admin/constraints`; zones: https://docs.medusajs.com/resources/admin-widget-injection-zones
- Modules and data models: https://docs.medusajs.com/learn/fundamentals/modules, `/data-models/property-types`; links: `/module-links`
- API routes and validation: https://docs.medusajs.com/learn/fundamentals/api-routes, `/api-routes/validation`, `/api-routes/protected-routes`; workflows: `/workflows/compensation-function`
- Store and locales: https://docs.medusajs.com/resources/references/store/models/Store, https://docs.medusajs.com/resources/commerce-modules/translation/concepts
- pnpm: https://docs.medusajs.com/learn/configurations/pnpm
- Installed source: `@medusajs/utils` `dist/common/get-resolved-plugins.js` (2.21.2 and 2.22.2)
