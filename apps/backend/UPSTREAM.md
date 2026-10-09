# Upstream: medusajs/dtc-starter

This folder is a copy of `apps/backend` from [medusajs/dtc-starter](https://github.com/medusajs/dtc-starter), not a submodule. This file records where it came from and every change made since, so a later diff against upstream stays cheap.

| | |
|---|---|
| Upstream | `https://github.com/medusajs/dtc-starter`, folder `apps/backend` |
| Commit | `15ef93da7d155ad990d8cc6db0296446fecbdfe6` (2026-10-02) |
| Copied | 2026-10-09, task T05 of the M0 plan |
| License | MIT, copyright Medusa. The notice is in [LICENSE](LICENSE) (dtc-starter's root `LICENSE`, copied as is) |
| Source of the copy | `/opt/dtc-starter/apps/backend` in the cloud environment: the `codeload.github.com` tarball of that commit, fetched by the setup script (docs/CLOUD.md, script step 6). The tarball has no `.git`, so the commit is the one in the script's URL |

## Local changes

Every difference from upstream's `apps/backend` at that commit. Anything not listed here is unchanged.

| File | Change | Why |
|---|---|---|
| `package.json` | `name` `@dtc/backend` → `@shopblok/backend`; `private: true` added; `description` rewritten | Workspace naming (`@shopblok/*`); never publish it |
| `package.json` | `typescript` `^5.6.2` → `5.9.3` | D5. Medusa's CLI uses `ts-node`, and `medusa build` calls `ts.createProgram`, so TypeScript 7 is out |
| `package.json` | The three `test:*` scripts start with `cross-env` (`cross-env TEST_TYPE=… NODE_OPTIONS=… jest …`) | The `VAR=value command` form doesn't work in Windows shells (W1, W2). `cross-env` 10.1.0 is added to `devDependencies` |
| `package.json` | `devDependencies` gained `@medusajs/eslint-plugin` 2.21.2, `eslint` 9.39.5 and `jiti` 2.7.0 | `eslint.config.ts` imports the plugin and `eslint/config`, and ESLint 9 needs `jiti` to read a `.ts` config. dtc-starter declares all three in its **root** `package.json`, which this repo doesn't have, so the backend has to declare them itself. Without them `medusa lint` (and `medusa build` and `medusa develop`, which lint first) can't load the config, and `pnpm --filter @shopblok/backend exec eslint` would reach the image's global ESLint 10.1.0 |
| `.env.template` | Renamed to `.env.example`, and rewritten: D15 host ports in every URL (Postgres 15432, Redis 6380, Meilisearch 7701), `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY` (the dev master key from `infra/docker-compose.yml`), CORS for this repo's origins (storefront 8000, admin 9000; the `docs.medusajs.com` and `:5173` entries are gone), `MEDUSA_BACKEND_URL`, `JWT_SECRET` and `COOKIE_SECRET` left empty (upstream: `supersecret`, which Medusa accepts in production), `MEDUSA_FF_TRANSLATION=true`, `STOREFRONT_URL` and the `PAYLOAD_*` / `REVALIDATE_SECRET` link variables (SPEC §15). `DB_NAME` is dropped | The root `.gitignore` ignores `.env.*` except `.env.example`, so a `.env.template` could never be committed. `DB_NAME` is read only by `medusa db:create`, which this repo doesn't use (compose's init script creates the databases); the app uses `DATABASE_URL` |
| `jest.config.js` | `require("@medusajs/utils")` → `require("@medusajs/framework/utils")` (same `loadEnv`) | `@medusajs/utils` is not a dependency of the backend. Under pnpm's isolated layout it resolves only because the `jest` `.bin` shim sets `NODE_PATH` to the hoisted store; `node node_modules/jest/bin/jest.js` (what some IDE runners do) fails with `Cannot find module '@medusajs/utils'`. `@medusajs/framework` is declared, and `medusa-config.ts` takes `loadEnv` from it too |
| `src/migration-scripts/initial-data-seed.ts` | Removed | D7: it seeds inside `medusa db:migrate`, which runs in production's predeploy step too, and it hard-wires one EUR region. T07's `medusa exec` scripts replace it |
| `src/api/store/custom/route.ts`, `src/api/admin/custom/route.ts` | Removed | Upstream's example routes |
| `src/scripts/seed-demo-products.ts` | Removed | Replaced by T07's `seed-demo-catalog.ts`. Upstream has no `seed` script in `package.json` either, so dtc-starter's `backend:seed` root script is stale |
| `package.json` | `scripts.test` added: `pnpm run test:unit` | T06. Without a `test` script, root `pnpm test` (turbo) skips the backend, so its unit tests would never run in CI. Upstream has none. The integration scripts stay out of it: they need a database |
| `medusa-config.ts` | Rewritten around `buildConfig(process.env)` (`src/config/config.ts`): the file is now `loadEnv` plus `defineConfig(buildConfig(process.env))`. The config object moved there so a unit test can reach it: `modules` (from `buildModules`), `projectConfig.redisUrl` (only when `REDIS_URL` is set), `admin.storefrontUrl` (from `STOREFRONT_URL`) and `featureFlags: { translation: true }` are added, and in `projectConfig.http` `jwtSecret` and `cookieSecret` go through `getSecret`; the CORS lines are unchanged. The style stays upstream's (single quotes, no semicolons) | T06. Upstream ignores `REDIS_URL` and registers no translation module (`src/config/modules.ts` says which modules register and why). `getSecret` is needed because `.env.example` leaves both secrets blank: `defineConfig` passes a blank `jwtSecret` to the User module, which refuses to start (`No jwt_secret was provided in the UserModule's options`, so `db:migrate` exits 1 after its migrations). A blank becomes `undefined`, which falls back to `supersecret`, only when `NODE_ENV` is unset, `development` or `test`; production and any other `NODE_ENV` (staging) keep the blank and refuse to start |
| `src/config/modules.ts` | Added: pure `buildModules(env)`, `has(env, ...keys)` and `getRedisUrl(env)` | T06. Translation and the local notification provider (email and feed channels) always; event bus, workflow engine and locking on Redis when `REDIS_URL` is set; caching also when `MEDUSA_FF_CACHING=true` |
| `src/config/config.ts` | Added: pure `buildConfig(env)` (everything `medusa-config.ts` passes to `defineConfig`) and `getSecret(env, key)` | T06. Moved out of `medusa-config.ts` so the blank-secret rule, `redisUrl`, `storefrontUrl` and the translation flag have tests |
| `src/config/__tests__/modules.unit.spec.ts` | Added: 16 Jest tests for the file above (`pnpm --filter @shopblok/backend test:unit`) | T06. The three env cases of the plan's Verify, plus blank values, the flag's `true` rule (any case), no `in_memory` caching and purity |
| `src/config/__tests__/config.unit.spec.ts` | Added: 10 Jest tests for `config.ts` (`pnpm --filter @shopblok/backend test:unit`) | T06 review. `getSecret` per `NODE_ENV`, both secrets, `redisUrl`, CORS and database URL pass-through, `storefrontUrl`, the translation flag, and that it reads only the env it is given |
| `src/scripts/seed-markets.ts` | Added: the store's currencies and locales, the default sales channel and its publishable key, four regions with a tax region per country, and fulfilment (stock location, one service zone and a "Standard" shipping option per region). Idempotent, core-flows workflows only; run with `medusa exec` | T07, D7. Replaces `migration-scripts/initial-data-seed.ts` (removed above) for what every environment needs. It completes the default store, sales channel and key that Medusa creates on every boot (`createDefaultsWorkflow`) instead of creating its own |
| `src/scripts/seed-demo-catalog.ts` | Added: 8 products with variants in EUR, USD, GBP and CHF, 3 categories, 2 collections, 54 Greek/German/French translations (`batchTranslationsWorkflow`), then the search index. Development only; skipped by `SEED_DEMO=false` or a `skip` argument; refuses every `NODE_ENV` except unset, `development` and `test` | T07, D7. Replaces `seed-demo-products.ts` (removed above) |
| `src/scripts/print-publishable-key.ts` | Added: prints `{"publishableKey":"pk_…"}` for T13's bootstrap, and exits 1 if the key is missing or has no sales channel | T07 |
| `src/scripts/lib/{markets,demo-catalog,plan,publishable-key}.ts` | Added: the data both seeds use, the pure functions that decide what is missing or has drifted, and the output line's format and parser | T07. No Medusa imports in the data files, so they have unit tests |
| `src/scripts/lib/__tests__/*.unit.spec.ts` | Added: 38 Jest tests (`pnpm --filter @shopblok/backend test:unit`), 49 since T08 | T07 (31 at first, 7 more for the review fixes in SETUP.md, "Smaller observations"); T08 added 11 for the store name, the demo prices and the market lists |
| `src/search/helpers/resolve-product-ids.ts` | Changed: the `product-option` and `product-option-value` cases read `products.id` and `option.products.id` (and skip null rows) instead of `product_id` | T08, Stephanos's decision on T07 item 7. Since 2.16 a product option has `products` and no `product_id`, so upstream's branches always failed (`Cannot read properties of undefined (reading 'product_id')`) and a renamed shared option left its products' search documents stale |
| `src/search/helpers/pricing.ts` | Changed: `PRICE_CURRENCIES` is the store's currencies (`SUPPORTED_CURRENCIES`, from `src/config/markets.ts`) instead of `["eur", "usd"]`; `PriceCurrency` is `SupportedCurrency`; the comment says a new currency needs `medusa db:migrate` and a restart | T08, D17, T07 item 9. The index now has `min_price_gbp`, `min_price_chf` and a price set for every other currency a shop sells in |
| `src/config/markets.ts` | Added: `SUPPORTED_CURRENCIES`, `MARKET_REGIONS`, `SUPPORTED_LOCALES`, `TRANSLATED_LOCALES`, the store's name, and the steps to open a market. `src/scripts/lib/markets.ts` re-exports them | T08, D17. The seed and the search index read one list |
| `src/scripts/lib/plan.ts`, `seed-markets.ts`, `lib/demo-catalog.ts` | `storeName` and a `name` drift (the store is named `Shopbloks Starter` while it has Medusa's default); `DEMO_RATES_PER_EUR` and `demoPrices` (the demo catalog prices itself in every supported currency) | T08, Stephanos's decisions on T07 items 10 and 9 |
| `src/config/__tests__/search-{pricing,resolve-product-ids}.unit.spec.ts` | Added: 10 Jest tests for the two search helpers above | T08. They live here, not in `src/search/`: Medusa requires every file under `src/search/` when the app boots, and a test file there crashed `db:migrate` and the dev server (SETUP.md, "Backend decisions from T07 (done in T08)", item 4) |
| `LICENSE` | Added | The MIT notice, because this is a copy of MIT-licensed code |
| `UPSTREAM.md` | Added | This file |

Kept on purpose, so a diff against upstream shows nothing for them: `tsconfig.json`, `eslint.config.ts`, `instrumentation.ts`, `integration-tests/setup.js`, `.gitignore`, `README.md` (the generic Medusa one), `src/admin/**`, `src/search/**` (the product index and its helpers, except the two files listed above), `src/api/middlewares.ts` (the `configureStoreSearch` middleware for `POST /store/search`) and the placeholder `README.md` files under `src/`.

Dependencies the plan pins are already exact upstream: every `@medusajs/*` at 2.21.2, `@medusajs/ui` 4.2.6 (what `@medusajs/dashboard@2.21.2` itself pins), `@tanstack/react-query` 5.64.2, `react-i18next` 13.5.0, `react-router-dom` 7.18.2 and `zod` 4.2.0. `react` and `react-dom` stay `^18.3.1` (the admin's React, D6). The remaining ranges (`jest`, `@swc/*`, `vite`, `ts-node`, `@types/*`, …) are upstream's, and the lockfile pins what they resolve to. `@types/node` is still upstream's `^20.12.11`, not the repo's 22.20.5.

## What lives in dtc-starter's root and is not copied

- `package.json`: `@medusajs/eslint-plugin`, `eslint`, `jiti`, `react` 18.3.1 and `react-dom` 18.3.1 as root devDependencies (the first three are now declared in this package, see above), and `pnpm.overrides` for `@types/react` and `@types/react-dom` (19.0.5) and `tsconfig-paths` (`^4.2.0`). The overrides serve upstream's storefront. Here the backend resolves `@types/react` 18.3.x, which matches its React, and nothing needed `tsconfig-paths`.
- `.npmrc` (`auto-install-peers=true`, which is pnpm's default since 10), `pnpm-workspace.yaml`, `turbo.json`, `eslint.config.ts` (the same content as the backend's), `AGENTS.md`, `CLAUDE.md`, `.github/` and `apps/storefront`.

## Comparing with upstream later

What upstream changed since our commit:

```bash
git clone https://github.com/medusajs/dtc-starter /tmp/dtc-starter
git -C /tmp/dtc-starter diff 15ef93da7d155ad990d8cc6db0296446fecbdfe6 origin/main -- apps/backend
```

What we changed (should match the table above; `node_modules`, `.medusa` and `.env` are ignored by git, so exclude them):

```bash
git -C /tmp/dtc-starter checkout 15ef93da7d155ad990d8cc6db0296446fecbdfe6
git diff --no-index --stat /tmp/dtc-starter/apps/backend apps/backend
```

Don't merge upstream's `package.json` or `medusa-config.ts` blindly: both are ours to change from T06 on. A new upstream release of Medusa means bumping every `@medusajs/*` together, as the plan's §2 does.
