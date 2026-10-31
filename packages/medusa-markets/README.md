# @shopblok/medusa-markets

A Medusa plugin (M4b, T73): the market settings Medusa has no field for.

Medusa already has the countries (a country is in a region, chosen in the region form) and the
languages (the store's locales, Store → Locales). This plugin stores only the rest:

- per country: `enabled` (**false by default**: a country just added to a region is a closed market),
  `languages` (ISO 639-1, the default first), `domain`, `time_zone` and a `rank` (its place in the map);
- per language: the store locale it uses (`medusa_locale`) and an optional `<html lang>`;
- shop-wide: the primary country and the fallback market (hreflang `x-default`).

| | |
|---|---|
| Module | `markets` (`market_country`, `market_language`, `market_settings`); `getMap(regionCountryCodes)` returns `@shopblok/fixtures`' `MarketMap` |
| Workflows | `saveMarketCountryWorkflow`, `saveMarketSettingsWorkflow` (checks, write with compensation, event `shopblok.markets.updated`) |
| Admin API | `GET /admin/markets`, `POST /admin/markets/countries/:code`, `POST /admin/markets/settings` |
| Store API | `GET /store/markets` (publishable key) |
| Admin | `src/admin` (no widgets yet; the panels on the Region and Store pages are T74) |

## In this monorepo

This is the one package that **has a build step** (SPEC D3 says none for `packages/*`): Medusa loads
a plugin from its `.medusa/server`, and skips its modules without a word when that folder is missing.

```bash
pnpm --filter @shopblok/medusa-markets build   # medusa plugin:build → .medusa/server
pnpm --filter @shopblok/medusa-markets dev     # rebuild on change and restart the backend
pnpm --filter @shopblok/medusa-markets db:generate   # a new migration (needs DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME)
pnpm --filter @shopblok/medusa-markets test    # unit tests
```

`pnpm build` and `pnpm dev` at the root build it first (turbo `^build`), `pnpm bootstrap` builds it
before `medusa db:migrate`, and CI builds it before any job that starts Medusa. The backend applies
the migration with `medusa db:migrate`.

The plugin reads `@shopblok/i18n/languages.json` (Payload's 42 content languages) at run time and
only types from `@shopblok/fixtures`: both packages export raw TypeScript, which the plugin's
CommonJS output cannot load.

SETUP.md, "The markets plugin (T73)", has the decisions, the routes and the measurements.
