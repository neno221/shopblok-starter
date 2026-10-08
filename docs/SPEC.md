# Shopblok Starter: Medusa × Payload × Next.js

**Spec v0.5** · 2026-10-08 · facts checked against official docs on this date

Status tags:
**[Decided]** agreed · **[Proposed]** a default I picked, confirm or change · **[Risk]** see §17.2

### Decisions log

| Date | Decision |
|---|---|
| 2026-10-08 | **Name:** Shopblok Starter. Repo `shopblok-starter`, packages `@shopblok/*` |
| 2026-10-08 | **Distribution:** private agency starter, cloned for each client brand |
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
| G1 | Runs end to end locally (`docker compose up` + `pnpm dev`) **with no third-party accounts**. Stripe, Resend, PostHog, Sentry and R2 each switch on by adding env vars. |
| G2 | Editors can build the `<main>` of any page, including the homepage, from blocks. They choose each block's data source (Medusa categories, collections or products), upload images, edit copy, preview live and manage SEO. No code needed. |
| G3 | Header and footer designs are chosen from Payload globals. |
| G4 | One design-system reference page lists every token, atom, molecule, organism, section, template and page at 375, 768 and 1440 px. |
| G5 | Secure and SEO-friendly by default, following the official Next.js guidance. |
| G6 | Neutral, monochrome, light-only baseline with no brand styling baked in. |
| G7 | Multi-region and multi-language from v1. New countries and languages are added in settings, without code. |

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
5. **Variants are data.** One registry drives the Payload select options and thumbnails, the renderer, and the design-system page.
6. **Presentational sections.** Sections take normalized props from resolvers, so the same UI can render live Medusa data, Payload content or fixtures.
7. **Accessible.** WCAG 2.2 AA, cart and checkout fully keyboard-usable, 44 px touch targets, `aria-live="polite"` on the cart count, `env(safe-area-inset-bottom)` on sticky mobile CTAs.
8. **No emojis in the UI.** Use Lucide icons or images.
9. **No hard-coded strings or formats.** All copy comes from i18n messages. All money and dates go through `Intl` with the active locale.
10. **Markets are data.** Countries and languages come from settings (Medusa + Payload), never from code constants.

---

## 3. Stack and versions

| Layer | Choice | Version (2026-10-08) | Notes |
|---|---|---|---|
| Runtime | Node 22 LTS | ≥ 22.22 | Matches dtc-starter `engines`. Payload v4 will need Node ≥ 24.15 |
| Package manager | pnpm 10 + Turborepo | n/a | `node-linker=hoisted` because E: is exFAT |
| Commerce | **Medusa** | **2.21.2** | Backend scaffolded from `medusajs/dtc-starter` `apps/backend` |
| Storefront | **Next.js** | **16.4.x** (React 19.3) | Must be ≥ 16.3.6 because of the critical `next/og` RCE advisory (GHSA-vcvr-r3jv-pc5j). Payload's peer range is ≥ 16.3.3 < 17 |
| CMS | **Payload** | **3.90.2** | Embedded in the storefront. Upgrade to v4 once it's stable |
| UI | Tailwind CSS v4, shadcn/ui (Base UI flavour, `base-nova`), lucide-react, **Inter** | n/a | The `E:\commerce-blocks` scaffold can seed `packages/ui` |
| i18n | `next-intl`, with messages from Payload; Payload localization; Medusa Translation Module | n/a | §8.5 |
| Data | Postgres 17 | n/a | Medusa's Postgres search provider needs the `pg_trgm` and `unaccent` extensions |
| Cache / queues | Redis 7 | n/a | Medusa event bus, workflow engine, locking, caching, sessions, rate limiting |
| Search | **Medusa Search Module** (v2.21.1+) + custom Meilisearch provider | Meilisearch v1.x | Storefront uses `@medusajs/instantsearch-adapter` + `react-instantsearch` against `/store/search` |
| Object storage | **Cloudflare R2** (S3 API) | n/a | Everywhere. Local disk when no keys are set |
| Email | Resend + react-email | n/a | Medusa custom notification provider; Payload uses `@payloadcms/email-resend` |
| Payments | Stripe, `@medusajs/medusa/payment-stripe` | n/a | Payment Element, automatic payment methods, saved methods |
| Analytics | PostHog | n/a | Medusa Analytics Module (`posthog-node`) + `posthog-js` in the storefront |
| Errors | Sentry | n/a | `@sentry/nextjs`, `@payloadcms/plugin-sentry`, backend via Medusa `registerOtel` |
| Hosting | **Vercel** (storefront + Payload); **Railway** (Medusa server + worker, Postgres, Redis, Meilisearch) | n/a | §10.8 |
| Tests | Vitest, Playwright, axe-core, Lighthouse CI | n/a | n/a |

**Why not fork the Next.js starter?**
- `medusajs/nextjs-starter-medusa` was **archived in April 2026**. Since Medusa 2.14, `create-medusa-app` generates the **`dtc-starter`** monorepo (`apps/backend` + `apps/storefront`).
- Its storefront still uses Next 15.5 and Tailwind 3. Its UI is not token-driven, and its locale lives in a cookie rather than the URL.
- So we take dtc-starter's **backend and commerce logic** (data layer, checkout, Payment Element, payment-return route, search index, email verification) and build the **storefront UI from scratch**.

---

## 4. Repository layout

```
shopblok-starter/
├─ apps/
│  ├─ backend/                Medusa 2.21 (API :9000, Medusa Admin :9000/app). Based on dtc-starter/apps/backend. Deployed to Railway
│  └─ storefront/             Next.js 16.4 + embedded Payload 3.90 (:8000, Payload admin /admin). Deployed to Vercel
│     ├─ src/app/(payload)/      generated Payload admin + REST (/admin, /api)
│     ├─ src/app/(storefront)/   [market]/… storefront routes (internal; public URLs via proxy rewrite, §8.5)
│     ├─ src/app/design-system/  DS reference (§9.6)
│     ├─ src/payload/            collections, globals, blocks, fields, hooks, access
│     ├─ src/lib/medusa/         server-only DAL (SDK, cookies, actions)
│     ├─ src/lib/cms/            server-only Payload Local API queries
│     ├─ src/lib/markets/        market resolution, URL builder, hreflang
│     └─ src/resolvers/          productSource/categorySource → section props
├─ packages/
│  ├─ ui/                     @shopblok/ui: tokens → atoms → molecules → organisms → sections → templates (presentational only)
│  ├─ registry/               @shopblok/registry: variant manifest (id, kind, label, thumbnail, prop contract)
│  ├─ i18n/                   @shopblok/i18n: default message catalogs (en, de, fr, el), formatters
│  ├─ fixtures/               @shopblok/fixtures: typed mock data (@medusajs/types + Payload types), multi-locale
│  ├─ emails/                 @shopblok/emails: react-email layouts (copy comes from Payload)
│  └─ config/                 tsconfig / eslint / prettier presets
├─ infra/docker-compose.yml   postgres, redis, meilisearch, mailpit (local only; no object-storage container)
├─ scripts/                   bootstrap, doctor, thumbnails, figma-tokens
├─ docs/                      SPEC.md, SETUP.md, DEPLOY.md (Vercel + Railway + R2), GO-LIVE.md, adr/
├─ .npmrc                     node-linker=hoisted
├─ pnpm-workspace.yaml, turbo.json
```

**Payload placement [Decided]:** embedded in the storefront, as the official Medusa × Payload guide does. One Vercel project, Local API with no HTTP hop, same-origin live preview.

---

## 5. Local infrastructure

| Service | Port(s) | Used by | Notes |
|---|---|---|---|
| Postgres 17 | 5432 | Medusa (`medusa` DB), Payload (`payload` DB) | One instance with two databases. Extensions `pg_trgm` and `unaccent` |
| Redis 7 | 6379 | Medusa modules + sessions | Optional in dev (in-memory fallbacks) |
| Meilisearch v1 | 7700 | Medusa Search provider | Master key only on the backend. The browser never talks to Meilisearch |
| Mailpit | 8025 / 1025 | Local inbox for Payload SMTP (optional) | Medusa uses `notification-local` without Resend |
| Object storage | n/a | Medusa files, Payload media | **Local disk** with no keys. A dev **R2** bucket once `S3_*` keys are set (§10.7) |

**`pnpm bootstrap`**
1. Migrates both databases.
2. Seeds Medusa:
   - regions and countries for the default markets (§8.5);
   - store locales `en`, `de`, `fr`, `el`;
   - products with translations, categories, collections;
   - stock location, publishable key.
3. Creates the Medusa admin user.
4. Writes `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` into the storefront `.env`.
5. Creates the Payload `integrations` API user and writes `PAYLOAD_API_KEY` into the backend `.env`.
6. Runs the first Medusa → Payload sync: products, categories, collections, markets.
7. Seeds Payload with localized content: homepage, header and footer, UI strings, email copy, demo media.

**`pnpm doctor`** prints which integrations are live and which are on fallback. It also warns about combinations that won't work in production, for example sign-ups that require email verification while Resend isn't configured. The same data drives the Payload status panel (§7.6).

---

## 6. Backend (Medusa 2.21, on Railway)

### 6.1 Module configuration (all env-gated)

| Concern | Provider when keys are present | Fallback with no keys |
|---|---|---|
| Payment | `@medusajs/medusa/payment-stripe` (id `stripe`, so `pp_stripe_stripe`), `automatic_payment_methods: true` | `pp_system_default` (manual), always present |
| Notification (email) | Custom `./src/modules/resend` (official guide) | `@medusajs/medusa/notification-local`, which logs to the console, including verification links. One provider per channel |
| Analytics | `@medusajs/analytics-posthog` (+ `posthog-node`) | `@medusajs/medusa/analytics-local`. Always registered so `track()` never fails |
| File | `@medusajs/medusa/file-s3` → **R2** (`region: "auto"`, R2 endpoint) | `@medusajs/medusa/file-local` |
| Search | `@medusajs/medusa/search` + custom `./src/modules/meilisearch-search` (`default_provider`) | `@medusajs/medusa/search-postgres`, registered by default |
| Translation | `@medusajs/medusa/translation` + `featureFlags: { translation: true }` | Always on (multi-language is core) |
| Event bus / workflow engine / locking | `event-bus-redis`, `workflow-engine-redis`, `locking` + `locking-redis` | In-memory (dev only) |
| Caching | `@medusajs/medusa/caching` + `@medusajs/caching-redis` (+ `MEDUSA_FF_CACHING=true`) | Unregistered. There is no in-memory provider, and registering the module without a provider throws |
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
| Customer verification (dtc-starter flow) | Verify your email |
| `customer.created` (after verification) | Welcome |
| `invite.created` | Admin invite |
| `order.return_requested` / refund | Return and refund updates |

**`modules/meilisearch-search`**: Search Module provider (extends `AbstractSearchProviderService`).
- One index per locale.
- Facets: categories, collections, tags, type, option values, per-currency min price, in-stock, on-sale.
- **[Risk]** The Search Module landed in 2.21.1, and there's no official Meilisearch provider.

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
  - Migrations in production; `push` only in dev.
- **Localization**
  - `localization.locales` = a **preloaded list of about 35 languages** (all EU official languages plus common others).
  - `defaultLocale: 'en'`, the base language (§8.5), with `fallback: true`.
  - `filterAvailableLocales` shows editors only the locales enabled in the `markets` global. The config's `defaultLocale` must always stay in that list, or the admin crashes (reported issue).
  - Why preload: Payload's locale list is fixed when the server starts, so a language outside the preloaded list needs a config change and a database migration.
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

### 7.3 Globals

**`markets`**: the settings page for countries and languages (§8.5).
- **Synced from Medusa (read-only):** countries, their regions and currencies, and the store locales.
- **Edited in Payload:**
  - which countries are enabled;
  - each country's languages and default language;
  - the **primary country** (served at `/`) and the **fallback market** (x-default);
  - an optional domain per country;
  - an optional suggestion-banner message.

**`header`**
- `design`: variant picker with thumbnails.
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

### 7.4 Blocks (inside `<main>`)

Every block has two common fields:
- `variant`: registry options, thumbnails from the DS screenshots.
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
- **Integrations status panel** (from `pnpm doctor`).
- **Locale switcher** limited to the enabled locales, plus a per-document translation-completeness indicator [Proposed].

### 7.7 Preview, drafts, scheduling, revalidation

- **Live preview:** breakpoints 375×667, 768×1024 and 1440×900. The preview URL uses the selected locale's market path. Server-side `RefreshRouteOnSave` with autosave. Rendered only in draft mode.
- **`/next/preview`:** checks `PREVIEW_SECRET`, requires a `payload.auth()` user, uses `getSafeRedirect`, then calls `draft.enable()`. Exit via POST.
- **Drafts:** read access is `user ? true : { _status: { equals: 'published' } }`.
- **Scheduled publish:** Vercel Cron calls `/api/payload-jobs/run` with `CRON_SECRET`.
- **Revalidation:** hooks call `revalidateTag(tag, 'max')`, with tags per locale. Hooks are guarded by `req.context.disableRevalidate`.

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
| `{m}/` | Home (`site-settings.homepage`) | ✓ | cached shell + tags |
| `{m}/[...slug]` | CMS page | ✓ | cached + tags |
| `{m}/products/[handle]` | PDP | ✓ | cached; cart controls in Suspense |
| `{m}/categories/[...handle]` | PLP | ✓ | cached first page; facets via search |
| `{m}/collections/[handle]` | PLP | ✓ | same |
| `{m}/store` | PLP (all) | ✓ | same |
| `{m}/journal/[slug]` | Post | ✓ | cached + tags |
| `{m}/search` | Results | noindex | dynamic |
| `{m}/cart` | Cart | noindex | dynamic |
| `{m}/checkout` | Checkout (minimal chrome) | noindex | dynamic, nonce CSP |
| `{m}/order/[id]/confirmed` | Receipt | noindex | dynamic |
| `{m}/order/lookup` | Guest order lookup | noindex | dynamic |
| `{m}/account/*` | Dashboard, orders, order detail, addresses, profile, **payment methods**, wishlist, returns | noindex | dynamic |
| `{m}/login`, `/register`, `/verify`, `/forgot-password`, `/reset-password` | Auth | noindex | dynamic |
| `/api/payment-return`, `/api/revalidate` | Route handlers | n/a | n/a |
| `/next/preview`, `/next/exit-preview` | Draft mode | n/a | n/a |
| `/admin/*`, `/api/*` | Payload | disallow | n/a |
| `/design-system/*` | DS reference | noindex, gated | static |

**Internally**, every storefront route lives under `src/app/(storefront)/[market]/…`, where `market` is a key such as `el-cy`. `proxy.ts` maps clean public URLs to these internal routes with a rewrite, and the link builder does the reverse. Public URLs never show the internal key.

### 8.2 Data layer (port of dtc-starter logic, with known bugs fixed)

**`lib/medusa/*` (`server-only` DAL)**
- SDK singleton with the publishable key. Sends `x-medusa-locale` from the resolved market.
- Cookies: `_medusa_jwt` and `_medusa_cart_id` are **httpOnly, secure, `sameSite: "lax"`**.
- Server actions validate every input with zod, re-check auth, and return minimal DTOs.

**`proxy.ts`**
- Market resolution and rewrite (§8.5).
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

**Cache Components** (`cacheComponents: true`, `partialPrefetching: true`), validated by an M0 spike against the Payload admin. Fallback: `unstable_cache` + tags.

- **Catalog and CMS reads:** `'use cache'` + `cacheLife` + **global** tags. Region and locale are passed in as arguments.
- **Cart, customer and checkout:** in Suspense holes or `'use cache: private'`. The header cart count is a streamed island.
- **Mutations:** `updateTag('cart')` / `refresh()`.
- **Webhooks:** `revalidateTag(tag, { expire: 0 })` for price and stock changes, `'max'` for content.
- Vercel propagates `revalidateTag` across functions, so no Redis cache handler is needed.

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
- 3 steps: contact + address, delivery + payment, review. Only the region's countries are offered; the address format follows the country.
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
- `/{primary-country}/` (here `/cy/`) 301-redirects to `/`.
- Codes are lowercase ISO 3166-1 countries (`gb`, not `uk`) and ISO 639-1 languages (`el` for Greek).
- **Optional domain per country** (e.g. `shop.com.cy`): on that domain the country segment is dropped. Domains are added to the Vercel project and set in `markets`.
- Adding a country or language later never changes existing URLs.

**No automatic geo-redirects.** Google advises against them, and Googlebot mostly crawls from the US.
- A localized banner suggests the shopper's likely market instead (country from `x-vercel-ip-country`, language from `Accept-Language`). For example, a US visitor landing on `/` is offered `/us/`.
- An **explicit** choice is remembered in a cookie, and only then can `/` redirect to it.

**Adding a market in settings (no code, no deploy)**
1. **Medusa Admin → Regions:** add the country to a region (or create a region with its currency, taxes, payment and shipping providers).
2. **Medusa Admin → Store settings:** add the language to the store locales, if it's new.
3. **Payload → Markets:** enable the country, choose its languages and default language, and optionally a domain. Countries and locales appear there automatically through the sync.
4. **Translate:**
   - Catalog: Medusa Admin → Settings → Translations (spreadsheet-style bulk editor).
   - Content, UI strings and email copy: Payload, using the locale switcher.
   - Missing translations fall back to English, both in Medusa and in Payload.
5. The storefront picks it up through tag revalidation: proxy market map, sitemaps, hreflang, switcher.

Languages outside Payload's preloaded list need a one-line config change and a migration.

**Where translations live**

| Content | Source of truth | Mechanism |
|---|---|---|
| Product, variant, option, category, collection, tag and type text; shipping option names | Medusa | Translation Module (`x-medusa-locale` from the URL) |
| Pages, globals, blocks, catalog enrichment, SEO, media alt text, posts | Payload | Field-level `localized: true`, `fallback: true` |
| UI microcopy | Payload `ui-strings` (seeded from `@shopblok/i18n`) | `next-intl`, with messages loaded from Payload and cached |
| Email copy | Payload `email-templates` | Read by the Medusa Resend provider at send time |
| Prices, dates | Medusa region currency + locale | `Intl` (never ÷100) |

**Search:** one Meilisearch index per locale. **[Risk]** Localized indexing with the Search Module isn't documented yet; this is part of the M0 spike.

---

## 9. Design system

### 9.1 Source of truth: Figma

- **File:** "shadcn/ui – Design System by ReUI" (community, **CC BY 4.0**, credited in the README and on the DS page). Your copy: `1PUSIlNviAwiZT0praTxES`.
- **Access confirmed** after the plan upgrade (2026-10-08). From the variables on one component canvas:

| Variable group | Observed |
|---|---|
| Font | `font/family/font-sans` = **Inter**. Weights 400, 500, 600 |
| Type scale | Tailwind steps, e.g. `text/xs` 12/16, `text/lg` 18/28, `text/xl` 20/28, `text/4xl` 36 |
| Radius | xs 2, md 8, **lg 10**, xl 14, 3xl 22. This is the shadcn v4 scale on a 10 px base |
| Color | shadcn neutral (`base/background`, `base/foreground`, `base/muted`, `base/muted-foreground`, `base/accent`, `base/border`), plus opacity variants and an `info` hue |
| Spacing | Variables named after Tailwind classes (`gap/gap-2` = 8, `padding/padding-x/px-3` = 12, `size/size-5` = 20) |
| Modes | Light and dark values exist. **We import light only** |

- **Pipeline (M1):**
  1. Export every variable collection through the Figma plugin API.
  2. Commit as `packages/ui/tokens/figma.tokens.json`.
  3. A script generates `tokens.css` (Tailwind v4 `@theme` + `:root`, light only).
  4. Re-running the export shows any drift in a git diff.
- Known issue: about 9 components in the kit have broken property configurations when published as a library. We read variables and use the frames as visual reference only.
- **Primitives:** shadcn/ui (Base UI flavour) plus ReUI's free MIT components where useful. Keep the MIT notice.
- All components handle long translated strings (German runs about 30% longer, Greek is often long too) and use logical properties.
- Inter covers the Greek script, so subset it to Latin + Latin-ext + Greek.

### 9.2 Tokens

| Layer | Contents |
|---|---|
| Primitive | Neutral scale, status hues, Inter, type scale, spacing, radii, shadows, motion, breakpoints (375/768/1024/1440), z-index, containers |
| Semantic (shadcn contract) | `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1..5`, `sidebar-*` (+ `-foreground`) |
| Semantic (commerce additions) | `price`, `price-sale`, `price-original`, `rating`, `success`, `warning`, `info`, `badge-sale`, `badge-new`, `stock-in`, `stock-low`, `stock-out`, `overlay` |
| Brand override | `brands/<name>.css` reassigns semantic tokens, fonts and radius only |

Light theme only.

### 9.3 Atomic inventory (v1)

**Atoms:** Button, IconButton, Link, Input, Textarea, Select, NativeSelect, Checkbox, Radio, Switch, Label, Badge, Chip, Price, Rating, Swatch, SizePill, QuantityStepper, Skeleton, Spinner, Avatar, Icon, Logo, Separator, Kbd, Tooltip, Progress, StockIndicator, VisuallyHidden, Image, PaymentIcon (incl. Apple Pay, Google Pay, Revolut Pay), Flag.

**Molecules:** ProductCard (variants), PriceBlock, VariantSelector, SearchField, Breadcrumbs, Pagination, SortSelect, FilterGroup, ActiveFilterChips, CartLineItem, PromoCodeField, FreeShippingProgress, AddressCard, AddressForm (per-country format), ShippingOptionCard, PaymentMethodCard, **SavedPaymentMethodCard**, OrderSummaryRow, ReviewItem, RatingSummary, NewsletterForm, MarketSwitcher, Stepper, EmptyState, Toast, CopyCodeChip, CountdownTimer, AccordionItem, MediaFigure, ShippingEstimator, **VerificationNotice**.

**Organisms:** Header (6), MegaMenu, MobileNavDrawer, AnnouncementBar, Footer (5), CartDrawer, QuickCartDropdown, SearchOverlay, FilterSidebar, FilterDrawer, ProductToolbar, ProductGrid, ProductCarousel, ProductGallery, BuyBox, MobileStickyATC, ProductInfoAccordions, ReviewsSection, CheckoutSteps, PaymentStep, OrderSummary, AccountNav, OrderTimeline, OrderTable, AddressBook, PaymentMethodsManager, ReturnRequestForm, CookieConsent, QuickViewDialog, SizeGuideDialog, CompareTray, MarketSuggestionBanner, loading skeletons.

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

**Mobile behaviour** (every variant): drawer nav, bottom-sheet market switcher, and the cart is always visible.

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

**Gaps neither library covers** (all in v1):
- Navigation: mobile nav drawer, market switcher + suggestion banner, payment/market footer row.
- Search: predictive search overlay.
- PDP: gallery zoom, size guide, back-in-stock form, mobile sticky add-to-cart, shipping estimator.
- Account: dashboard, order history, address book, saved payment methods, returns request, guest order lookup, email verification screens.
- States: commerce empty states, loading skeletons.
- Marketing: USP bar, recently viewed.
- Deferred to v1.1: product Q&A, lookbook hotspots, store locator, gift cards.

### 9.6 Design-system reference page

**Route and access:** `/design-system`. `noindex`, excluded from the sitemap and robots. On in dev, behind Payload login in production. No Storybook.

**Navigation tree**
- Foundations: colors, type, spacing, radius, shadow, motion, icons, CC BY credit.
- Atoms, Molecules, Organisms.
- Sections (every block × variant).
- Headers and Footers.
- Templates.
- Pages.

**Each entry shows**
- A live render with fixtures.
- A states matrix.
- A **viewport switcher** (375 / 768 / 1440 iframes side by side).
- A **locale toggle** (en / de / fr / el) for long strings and currency formats.
- a11y notes and the matching Payload block schema.

**Generation:** built from `@shopblok/registry`. Playwright screenshots double as visual-regression baselines and as the Payload thumbnails.

---

## 10. Integrations

| Integration | Where | Turns on when | Fallback |
|---|---|---|---|
| **Stripe** | Medusa provider + Payment Element | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_KEY` + region enable script | `pp_system_default` |
| **Resend** | Medusa notification provider + Payload email adapter | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | console (`notification-local`) / Mailpit |
| **PostHog** | Medusa Analytics Module + `posthog-js` (after consent) | `POSTHOG_EVENTS_API_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY` | `analytics-local` / no client script |
| **Sentry** | Backend `instrumentation.ts`; `@sentry/nextjs`; `plugin-sentry` | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | not initialised |
| **Meilisearch** | Medusa Search provider (custom) | `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` (set locally by default) | `search-postgres` |
| **Redis** | Medusa modules, sessions, rate limiting | `REDIS_URL` (set locally by default) | in-memory |
| **Cloudflare R2** | Medusa `file-s3`, Payload `storage-s3` | `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL` | local disk (dev only; Vercel needs R2) |

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
- A verified sending domain is required before production sign-ups. `pnpm doctor` flags it because sign-up requires verification.

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
- One index per locale; versioned zero-downtime reindexing.

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
- Build hygiene: type and lint errors fail the build. Next pinned ≥ 16.3.6.

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

**Status codes:** `notFound()` before any Suspense boundary, so missing pages return a real 404. Redirects are 301/308 from Payload. No IP-based redirects.

**Crawlability:** `<a href>` pagination and facets. More than 2 facets → `noindex,follow`.

**Content:** H1 = product name, required localized alt text, rich Payload descriptions.

---

## 13. Accessibility and performance budgets

**Accessibility (WCAG 2.2 AA)**
- axe-core in CI on every DS entry and key route, in two locales.
- The token build checks contrast and fails below 4.5:1 for text and 3:1 for UI.
- Focus management in drawers and dialogs.
- Mega menu rules (open on hover or keyboard, full width, stays open over trigger or panel).
- Radio semantics for variants; a skip link; `aria-current`.
- Correct `lang` attributes.
- No autoplay when the user prefers reduced motion.

**Performance (p75, mobile)**

| Metric | Budget |
|---|---|
| LCP | < 2.5 s |
| INP | < 200 ms |
| CLS | < 0.1 |
| First-load JS (PLP/PDP) | ≤ 170 KB gz. Messages split per route and locale |
| LCP image | `preload` / `fetchPriority="high"`, AVIF/WebP, `sizes` |
| Below-fold images | `loading="lazy"`, ≤ 500 KB on mobile |
| Fonts | Inter via `next/font`, self-hosted, subset Latin + Latin-ext + Greek |

Lighthouse CI runs on Vercel previews.

---

## 14. Testing and CI

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Resolvers, price formatting per locale, variant selection, registry integrity, **market resolution + URL builder + hreflang**, CSP builder |
| Component | Vitest + Testing Library | States, keyboard, long strings |
| Backend | `@medusajs/test-utils` | Payload sync (incl. markets), search provider per locale, notification provider per locale, saved-payment-method routes (ownership), region-enable script, verification enforcement |
| E2E | Playwright | Keyless purchase in **CY (`/`) and US (`/us/`)**; `/cy/` → `/` redirect; CH language switch (`/ch/` ↔ `/ch/fr/`) keeps the cart; sign-up → verify → login (link read from the console provider); Stripe test mode with a saved card when keys exist; CMS: build → translate → publish per locale, live preview, redirect, header/footer switch; adding a market through settings |
| Visual | Playwright | DS × 3 widths (also the Payload thumbnails) |
| a11y | axe-core | DS + key routes |
| Perf | Lighthouse CI | Budgets on Vercel previews |
| i18n | Script | Code catalogs cover every `ui-strings` key |

**CI (GitHub Actions)**
1. Install, typecheck, lint, unit.
2. Build.
3. Compose services up, bootstrap, then e2e, visual and a11y.
4. Lighthouse on the Vercel preview.

Also: Renovate, `pnpm audit`, secret scanning.

---

## 15. Environment variables (outline)

**Backend (Railway)**

| Group | Variables | Notes |
|---|---|---|
| Core | `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `MEDUSA_BACKEND_URL`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | |
| Infra | `REDIS_URL`, `MEDUSA_FF_CACHING`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `MEILISEARCH_INDEX_PREFIX` | |
| R2 | `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FILE_URL` (public domain) | |
| CMS link | `PAYLOAD_SERVER_URL`, `PAYLOAD_API_KEY`, `PAYLOAD_USER_COLLECTION=integrations`, `STOREFRONT_URL`, `REVALIDATE_SECRET` | |
| Added later | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` | |
| Added later | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | |
| Added later | `POSTHOG_EVENTS_API_KEY`, `POSTHOG_HOST` | |
| Added later | `SENTRY_DSN` | |
| Production | `MEDUSA_WORKER_MODE`, `DISABLE_MEDUSA_ADMIN` | |

**Storefront (Vercel)**

| Group | Variables | Notes |
|---|---|---|
| Medusa | `MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_URL` | |
| Payload | `PAYLOAD_DATABASE_URL` (pooled), `PAYLOAD_SECRET`, `PREVIEW_SECRET`, `CRON_SECRET`, `REVALIDATE_SECRET` | |
| R2 | `S3_*` (media bucket), `S3_PUBLIC_URL` | |
| Added later | `NEXT_PUBLIC_STRIPE_KEY` | rebuild |
| Added later | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | |
| Added later | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | rebuild |
| Added later | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | rebuild |
| Flags | `DESIGN_SYSTEM_ENABLED` | |

Markets are **data** (Medusa + the Payload `markets` global), not env. The base language (`en`) is a Payload config constant set once per brand.

---

## 16. Go-live checklist: API keys added last

Every key is optional at boot. Public (`NEXT_PUBLIC_*`) keys need a Vercel redeploy.

1. **Infrastructure** (`docs/DEPLOY.md`)
   - Railway: server, worker, Postgres, Redis, Meilisearch; a staging environment.
   - Vercel: a project with environments paired to Railway, Vercel Cron, market domains.
   - R2: buckets per environment, a custom domain (on Cloudflare DNS), CORS.
   - Run `pnpm bootstrap` on staging, then production. Run a full reindex.
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
8. **Redeploy the storefront.** `pnpm doctor` should be all green.

---

## 17. Milestones and risks

### 17.1 Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | **Foundation**: monorepo, compose, backend from dtc-starter, Next 16.4 + Payload 3.90 shell, market resolution + proxy rewrite, `bootstrap`/`doctor`, CI. **Spikes:** Cache Components × Payload admin; Search Module per-locale indexing; Payload locale preloading with `filterAvailableLocales` | Everything boots wired together with no keys; spike ADRs written |
| M1 | **Design foundations**: full Figma variable export → tokens (light only), atoms, DS page shell (viewport and locale switchers, fixtures) | All atoms × 3 widths × 2 locales, contrast green |
| M2 | **Molecules + organisms + registry**, thumbnail generator | Registry drives the DS page and thumbnails |
| M3 | **Commerce core**: DAL, markets/i18n, search-backed PLP, PDP, cart, 3-step checkout (system payment), confirmation, account with **required email verification**, password reset | Keyless E2E in US and CY passes |
| M4 | **CMS**: collections, globals (incl. `markets`, `ui-strings`, `email-templates`), blocks, localization, sync (products, categories, collections, markets), live preview, drafts, scheduling, SEO, redirects, forms, revalidation | Editor builds, translates and publishes the homepage; adds a market from settings |
| M5 | **Section library**: all blocks × variants | On the DS page and selectable in Payload |
| M6 | **Integrations**: Stripe (Payment Element, **saved methods**, Apple Pay, Google Pay, **Revolut Pay**), Resend + localized emails, PostHog + consent, Sentry ×3, Meilisearch provider, Redis modules, **R2** | Each turns on purely via env |
| M7 | **Hardening + deploy**: CSP, headers, sitemaps, hreflang, JSON-LD, OG, a11y/perf; Vercel + Railway + R2 staging; docs | Audits green on staging |
| M8 | **Optional**: reviews, wishlist, comparison, Express Checkout Element | n/a |

### 17.2 Risks

| Risk | Mitigation |
|---|---|
| Payload × Cache Components "not guaranteed" | M0 spike; `unstable_cache` fallback |
| Search Module is new; no official Meilisearch provider; per-locale indexing undocumented | Postgres fallback; env-gated provider; M0 spike |
| Translation Module is behind a feature flag | Pin Medusa; e2e in 2 locales; fallback to default strings |
| Payload locales are fixed at startup | Preload ~35 languages + `filterAvailableLocales`; keep `defaultLocale` in the filtered list |
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
| Next `next/og` advisory | Pin ≥ 16.3.6; Renovate |

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
| Q8 | DS page | Gated in production; no Storybook |
| Q9 | Reviews, wishlist | M8; Q&A, gift cards, store locator, lookbook in v1.1 |
| Q10 | Editorial | `posts` collection |
| Q11 | Newsletter / free shipping | Resend Audiences (env-gated); threshold from Medusa |
| Q13 | Object storage | **R2 everywhere** (user decision) |
| Q14 | Cache Components | Yes, after the M0 spike |
| Q15 | Search | Meilisearch Search provider; products only |
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

**Payload 3.90**
- Localization (`filterAvailableLocales`): https://payloadcms.com/docs/configuration/localization
- Plugins: https://payloadcms.com/docs/plugins/overview
- Live preview: https://payloadcms.com/docs/live-preview/server
- storage-s3 (`clientUploads`): https://cdn.jsdelivr.net/npm/@payloadcms/storage-s3@3.85.1/README.md
- Website template: https://github.com/payloadcms/payload/tree/v3.90.2/templates/website

**International SEO (Google Search Central)**
- Multi-regional sites: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Locale-adaptive pages: https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages

**Hosting**
- Vercel 4.5 MB limit: https://community.vercel.com/t/4-5-mb-payload-limit/10500
- Railway Buckets (not used, private-only): https://docs.railway.com/storage-buckets

**Design and licensing**
- ReUI license: https://reui.io/legal/license · ReUI MIT repo: https://github.com/keenthemes/reui
- Figma kit (CC BY 4.0): https://www.figma.com/community/file/1649373313065184861/shadcn-ui-design-system-by-reui
- shadcnspace license: https://shadcnspace.com/license
