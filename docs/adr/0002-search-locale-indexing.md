# ADR 0002: Per-locale indexing with the Search Module

| | |
|---|---|
| Status | **Proposed** 2026-10-10 (S2 verdict: **PASS** as the plan defines it). Merging the PR (plan G2) puts it on `main` as *Proposed*; T17 sets it to *Accepted* once the owner confirms the readings R1 to R5 under "Decision" (or rewrites what the owner changes) |
| Date | 2026-10-10 |
| Spike | S2, [docs/plans/M0.md](../plans/M0.md) §6 |
| Versions | Medusa 2.21.2 (`@medusajs/search` and `@medusajs/search-postgres` 2.21.2), Meilisearch v1.54.3, PostgreSQL 17.11, Node 22.22.0, Jest through `@medusajs/test-utils` 2.21.2 |
| Prototype | commit `ca361b2` on `claude/amazing-volta-3sn94u` (D13: the spike code does not merge; the next commit removes it from the tree). PRs merge with a merge commit (plan G2), so it stays in `main`'s history. Reproduce: SETUP.md, "Search per locale (S2)", row "Reproduce" |

## Context

SPEC §6.2, §8.5 and §10.5 say "one index per locale" for the custom Meilisearch provider, and G7 says new countries and languages are added in settings, without code. S2 asks how products are indexed and queried per locale with Medusa 2.21's Search Module, for the keyless default (`search-postgres`) and for the M6 Meilisearch provider, and whether a language added in settings becomes searchable without code.

What the 2.21.2 source says, checked before building anything (the plan's "Known going in" holds, with one addition):

- A search document carries no locale, and the ingestion context is `{ container, index }`. `POST /store/search` never reads `req.locale` (Medusa sets it for every `/store` route from `x-medusa-locale` or `?locale=`).
- `search_options.locales` is passed to the provider untouched. `search-postgres` throws on it ("does not support query-time locales"). It takes one `language` option, creates only `medusa_search_english` (unaccent, then the English stemmer) in its migration, and an identifier registered twice throws.
- `query.graph(args, { locale })` applies translations (the Translation Module), and `graphSeed` / `graphConsume` accept a `transform` that receives a container with `query`. The Translation Module emits `translation.created|updated|deleted`, one event per translation row, carrying the translation id; the row says which entity it translates.
- Index fields are static (`search.define`), and an index definition is resolved when the module is built. A changed definition is a new index version: `medusa db:migrate` plans it and the next server start fills it and makes it live (SETUP.md T08, "Backend decisions from T07").
- **Added by S2:** a provider receives the destination as `index` (the physical index of the version being filled) and the logical definition separately; `definition.physical_name` is the unversioned root.

## Options

- **A: per-locale fields in one logical index** (`title_el_GR`, `category_el_GR`, ...), generated from a static list of locales. Variants built: `s2_pg_a` (search-postgres) and `s2_ms_a` (Meilisearch, with `localizedAttributes`).
- **A': one multilingual index.** One searchable field (`search_text`) holds every locale's title, description, category and option text; facets use category ids. Built: `s2_pg_ap`, `s2_ms_ap`.
- **B: one physical index per locale** inside the Meilisearch provider: the document carries its per-locale texts, the provider writes one document per locale into `<version physical name>__<locale>` and `search_options.locales` picks the index. Built: `s2_ms_b`. Postgres would use A or A'.

The prototype is a `meilisearch-search` provider (about 770 lines in five files on `fetch`, 544 of them the service: upsert, delete, clear, list, search with filters, facets, sort and pagination, `waitForTask`) and one file with the five index definitions. One app registers both providers and all five definitions over the same data, so every test runs on identical products. The tests are `apps/backend/integration-tests/http/search-locale.spec.ts` (T1 to T9, and T10 below), with the "Linen shirt" in `el-GR`, `de-DE`, `fr-FR`, `en-US`, `pt-BR` and `mn-MN`.

## Tests and results

Results are from the last run of each test; the numbers T4 and T7 report are from the moment the workflow returned.

| # | Test | `s2_pg_a` | `s2_pg_ap` | `s2_ms_a` | `s2_ms_b` | `s2_ms_ap` |
|---|---|---|---|---|---|---|
| T1 | each locale finds the shirt by its own words (`πουκάμισο`, `Leinenhemd`, `chemise`, `shirt`) | pass | pass | pass | pass | pass |
| T2 | accents and capitals ignored (`πουκαμισο`, `ΠΟΥΚΑΜΙΣΟ`, `legere`, `LÉGÈRE`) | pass | pass | pass | pass | pass |
| T3 | `Leinenhemd` with `el-GR` does not hit | isolated (informational) | **leaks** (informational; by design) | isolated | isolated (**required**, pass) | **leaks** (by design) |
| T4 | a changed translation is searchable within 10 s, through events: product title / category name / deletion | 0.4 / 0.4 / 0.4 s | 0.6 / 0.7 / 0.6 s | 0.9 / 1.0 / 1.0 s | 1.1 / 1.3 / 1.2 s | 1.4 / 1.5 / 1.4 s |
| T5 | category facet in the active locale | labels | ids, labelled by the storefront | labels | labels | ids, labelled by the storefront |
| T6 | hits translated by one extra `/store/products` call with `x-medusa-locale` (title and EUR 49 price) | pass | pass | pass | pass | pass |
| T7 | add `it-IT` and one translation, no restart | `Unknown field "title_it_IT"` (HTTP 400) | **found** (0.6 s) | not found | **found** (1.3 s) | **found** (1.5 s) |
| T9 | pt-BR `Camisa`, `linho`; mn-MN `Маалинган`, `цамц`, `МААЛИНГАН` | pass | pass | pass | pass | pass |
| T10 | (beyond the plan) a request with only `x-medusa-locale`, through a 25-line middleware | pass | pass | pass | pass | pass |

**T4 reading.** The five indexes are updated one after the other by the same event (the Search Module loops over the definitions that list it), so the times rise from left to right; one index on its own took 150 to 270 ms inside the handler. The same run over the Redis event bus (`REDIS_URL` set, queue in use) gave the same times. It was not run with a separate worker process. Category and deletion paths work: the translation row is soft-deleted, so the handler must read it with `withDeleted`.

**T7, restart flow for A.** `apps/backend/integration-tests/s2-t7-restart.sh` does it the way an operator would, on a throwaway database with the real seeds and `medusa develop`: boot with four locales and the demo catalog; check Italian finds nothing; **through the Admin API** add `it-IT` to the store's locales and one product translation; stop the server; add `it-IT` to the list (`S2_LOCALES` stands in for the edit of `SUPPORTED_LOCALES`); `medusa db:migrate` (12.0 s: "Migrating search indexes", a new pending version); start the server (HTTP up after 8.2 s, new version filled and live 0.5 s later, for the 8 demo products; a 1,000-product catalog takes about 15 s, T8). Before the restart Italian is an HTTP 400 on `s2_pg_a` (`Unknown field "title_it_IT"`) and 0 hits on `s2_ms_a`; after it both find it. In the same run `s2_pg_ap` and `s2_ms_b` found the Italian title straight after the Admin API call, with no restart. One surprise: the restart re-seeded `s2_ms_b` as well, because the prototype lists the locales in B's definition (for creating their indexes eagerly) and that changes its hash; B does not need the list, since it creates a locale's index on its first write, so M6's definition should leave it out.

**T8, cost of 1,002 products (1,000 generated, plus the two test products), six locales configured (three of them translated), PostgreSQL and Meilisearch on the same machine:**

| Index | Size on disk | Reindex time (three runs) |
|---|---|---|
| stock `product` (no locales; the M0 baseline) | 4.6 MB | 4.2 s (the first two runs, 239 s and 73 s, shared the machine with the index's own event backlog) |
| `s2_pg_a` (Postgres, A) | 7.1 MB | 16.8 / 15.5 / 16.3 s |
| `s2_pg_ap` (Postgres, A') | 6.0 MB | 15.6 / 14.7 / 14.7 s |
| `s2_ms_a` (Meilisearch, A) | 9.4 MB (1 index; documents 2.1 MB) | 16.0 / 15.1 / 15.1 s |
| `s2_ms_b` (Meilisearch, B) | 22.2 MB (6 indexes of 1,002 documents; documents 3.2 MB) | 15.9 / 17.0 / 16.7 s |
| `s2_ms_ap` (Meilisearch, A') | 5.9 MB (1 index; documents 1.4 MB) | 15.8 / 15.6 / 15.3 s |

Sizes are Postgres `pg_total_relation_size` (table, GIN full-text, trigram and JSONB indexes) and, for Meilisearch, the growth of the database's used size across one reindex with the other candidates' indexes deleted. **The reindex time does not depend on the candidate**: it is the transform (one `query.graph` read per locale and one pricing read per currency per batch of 200), about 15 ms per product here, against 4 ms for the stock index that reads no locale. B's cost is disk (2.3 times A, 3.8 times A') and the number of indexes (one per locale). The plan asked for four locales; the index had six, so per-locale numbers are B 3.7 MB each.

**T9, which Postgres configuration.** The provider uses `medusa_search_english`, the only configuration its migration creates: `unaccent`, then the English stemmer. Checked with `to_tsvector`: Greek is lowercased and de-accented (`'λινο'`, `'πουκαμισο'`), Cyrillic is lowercased (`'маалинган'`), Latin words of every language get English stemming (`chemise` becomes `chemis`). So Mongolian is found by its exact lexemes, not by the trigram index; a one-letter misspelling needs `typo_tolerance: true`, which is the trigram `word_similarity > 0.3` over the whole `search_text`. There is no Mongolian configuration in PostgreSQL. A different `language` needs its own `CREATE TEXT SEARCH CONFIGURATION medusa_search_<language>`; with the built-in `greek` configuration plus `unaccent` T1, T2 and T9 pass on both Postgres candidates. **Meilisearch** has no Mongolian either: its `locales` and `localizedAttributes` accept 141 ISO 639-1 and -3 codes (listed in its error message) and not `mn`, so the provider drops the hint (it logs a warning) and Cyrillic is tokenised by default; the title was found by its own words, upper-case included. A one-letter misspelling is found even with `typo_tolerance` off: the prototype does not map that per-query option, and Meilisearch's typo setting is per index.

### The tests can fail

Each mutation was applied to the prototype, to the database configuration or (for the assumptions spec) to Medusa's installed code, only the tests that should notice it were run, and the change was reverted.

| Mutation | Result |
|---|---|
| Postgres text-search configuration `simple` without `unaccent` (`S2_PG_LANGUAGE=simple S2_PG_UNACCENT=false`) | T2 failed on `s2_pg_a` and `s2_pg_ap` (`πουκαμισο` no longer found); nothing else failed |
| B ignores `search_options.locales` (always searches the default locale's index) | T1, T6 and T10 failed on `s2_ms_b` (Greek, German and French words found nothing) |
| the provider stops limiting candidate A to the locale's attributes | **not caught at first**: Meilisearch isolates a language by itself when it gets the language hint, so the isolation test held. Added a check on `mn-MN`, a locale Meilisearch has no language for; with it, T3 failed on `s2_ms_a` |
| the three `translation.*` events removed from the events the index lists | the three T4 tests and T7 failed (10 s timeouts) |
| B's fan-out copies every locale's title into each locale's document | T3 failed on `s2_ms_b` (`Leinenhemd` found with `el-GR`) |
| the transform selects `categories.name` but not `categories.id` | T5 failed on `s2_pg_a`, `s2_ms_a` and `s2_ms_b` (labels stayed English). This was also a real failure of my first version |
| B creates no index for a locale it was not configured with | T7 failed on `s2_ms_b` |
| the assumptions spec, with Medusa's installed code changed: `search-postgres` accepts `locales` | its first test failed |
| ... `updateTranslationsWorkflow` emits under another event name | its event test failed |
| ... `search-postgres` defaults to a `simple` configuration that does not exist | its `/store/search` and Greek-folding tests failed |

### Found on the way (Medusa, not the design)

1. **`updateTranslationsWorkflow` with a `selector` throws in 2.21.2** (`translations?.map is not a function`): the service returns one object for that form and the workflow's event step calls `.map` on it, so it emits nothing. The by-id form (`translations: [{ id, translations }]`), which `batchTranslationsWorkflow` and the admin use, works. The workflow's own JSDoc shows the `selector` form first.
2. **`query.graph(..., { locale })` translates a nested object only if its `id` is selected.** `categories.name` came back in English until `categories.id` was added; the same holds for `options` and `options.values`. There is no error. The merged assumptions spec guards it.
3. **One `translation.created` event per row.** A bulk import of N translations makes N handler runs per index, and each re-reads the whole product in every locale. With six indexes listening, creating 1,000 products took 698 s; with the S2 handlers muted, 323 to 330 s (the stock index's handlers still ran). Per index and event the handler took 150 to 270 ms. A bulk change should end with `reindex`; M3 or M4 may also want to coalesce events per product.
4. **Handlers for one event run one index after another** (see T4).
5. **A provider must write to `index`, not to `definition.physical_name`.** My first B wrote reindexed documents to unversioned indexes that no search reads; every test still passed, because the tests re-synced through the event path. T8 caught it (a reindexed B held 0 documents), and T8 now searches every candidate straight after its reindex.
6. **Creating a Meilisearch index and then configuring it leaves a window** in which a search fails with HTTP 400 ("Attribute `sales_channel_ids` is not filterable"). Meilisearch creates the index when its settings are updated, so B does that in one task. B creates the index of a new locale on its first write, which is when this bites.
7. **`medusa develop` restarts its server when the server dies**, so stopping only the listening process (what the T7 script first did) brings the old server back with the old environment; stop the process group.
8. Harness: `medusaIntegrationTestRunner` boots the app twice, and the first instance's startup seed of the first index failed on a closed connection; it restores the database before each test but not Meilisearch, so a test that changes data must re-sync the indexes; and the setup's event handlers ran for 12 s, so the spec waits for them. `apps/backend/.env` is loaded alongside `.env.test`, so the tests inherit `REDIS_URL` (and a running dev server's queues) unless it is blanked.

## Decision

**Verdict: PASS**, applying the plan's rule as written: T1, T2, T4, T5, T6 and T7 pass with B on Meilisearch, and T1, T2, T4, T6 and T7 pass with A' on Postgres (A passes T1, T2, T4 and T6, and T7 with a restart: see the open readings below).

1. **Meilisearch (M6): keep one index per locale (B).** The provider writes one document per locale into `<version physical name>__<locale>`, creates the locale's index on its first write (so a language added in the store needs no restart, no migration and no edit), takes the locales from the store's `supported_locales`, and selects the index with `search_options.locales` (one locale per query). Each index gets `localizedAttributes` for its language where Meilisearch has one.
2. **Postgres, the keyless default (M3): A'.** One searchable `search_text` that holds every locale's text, `category_ids` for facets, and the default-language `title` for sorting. It follows the store's locales and translations with no restart or migration, which is what D17 and G7 ask of a default that has to work without keys. It does not isolate languages (T3 leaks by design, informational for Postgres) and its facets are ids that the storefront labels with the categories it already fetches (T5 allows this). A is the alternative if per-language isolation or facet labels matter more than a restart-free new language.
3. **One transform for both.** It reads each product's texts per locale with `query.graph(..., { locale })`, selecting the ids of categories, options and values, and the locales from the store; B's document carries the result under `_locales`, A' derives `search_text` from the same result. The two providers differ in `fields`, not in what is read.
4. **The locale reaches the search through the backend.** A middleware on `POST /store/search`, after the core validator, turns `req.locale` into the options of the index behind the entity (T10): `locales: [locale]` for Meilisearch, nothing for A'. The storefront sends the same request whichever provider is active, and `@medusajs/instantsearch-adapter` only has to send `x-medusa-locale`.
5. **Events.** The index lists the three `translation.*` events and maps them to products through the `translations` entity (`withDeleted` for deletions): `product` itself, and `product_category`, `product_option`, `product_option_value` and `product_tag` through the existing `resolveProductIds`. Writes of translations use the by-id form.

**Readings of the plan's rules that are yours to decide** (the rules were not changed):

- **R1.** The PASS rule requires B on Meilisearch, and it passed, so the rule keeps one index per locale there. A passed every test on Meilisearch too (T3 isolation through `locales` alone, T5 labels, T10), failing only T7 without a restart, at 9.4 MB against B's 22.2 MB and with no fan-out code in the provider. If you would rather have one definition for both providers (A on both), the evidence supports it, at the price of T7's restart. I followed the rule.
- **R2.** T7 says "at most a worker restart and a reindex, and no code change". For A the steps are an edit of `SUPPORTED_LOCALES` in `src/config/markets.ts` (the one place D17 names), `medusa db:migrate` (a new index version), a restart and the reindex that start performs: 12.0 s for the migration and about 9 s for the restart that fills the new version (8 products; about 15 s of reindex per 1,000). Whether that edit and the migration count as "no code change" is for you. A' and B need none of it.
- **R3.** T4 says "in worker mode". It ran in one process that is both server and worker, over the in-memory bus and over Redis; a separate worker process was not run.
- **R4.** T8 is "recorded": there is no threshold, so there is no pass or fail. The plan said four locales; the index had six.
- **R5.** T9 expected Mongolian to be "found by trigram only". It is found by its exact lexemes with the provider's default configuration, and the trigram index matters only for misspellings.

## Consequences

- **M3** implements the Postgres side: the index definition (A'), the transform (shared with B), the events above, the middleware, and a `doctor` check if any list has to agree with another (A' has none). The PLP asks `/store/search` for `category_ids` facets on Postgres and labels them from `GET /store/product-categories?id[]=` with `x-medusa-locale`; hits are shown through one `GET /store/products?id[]=...&region_id=...` with the header (T6), which also supplies prices. Add a mutation-checked spec for each of these, as S2's `search-locale.spec.ts` does.
- **M6** implements the Meilisearch provider (B), from the prototype's shape and with these changes: the official `meilisearch` client instead of `fetch`; settings-first index creation; locale index names from `index`; the stale-copy cleanup when a locale disappears from a document; several locales per query (Meilisearch federated search; the prototype throws); highlight and range facets (the prototype throws); and the language hints limited to the codes Meilisearch accepts, with a logged warning for the rest (`mn`).
- **Bulk translation changes** (M4's Medusa-to-Payload sync, a CSV import) must end with `searchModule.reindex({ index })`, or the event backlog described above follows. M3 or M4 should decide whether to coalesce `translation.*` events per product.
- **A new language** in Medusa needs its translations (`batchTranslationsWorkflow`, the by-id update) and the store's `supported_locales` (`seed-markets.ts` sets exactly `SUPPORTED_LOCALES`, so a locale added only in the admin is removed on the next seed run: SETUP.md, T07, "Smaller observations", last bullet). Nothing else for Meilisearch (B) and Postgres (A').
- **Postgres and other languages.** The provider has one `language` for all indexes. Per-language stemming (`greek`, `german`) is not possible with the stock provider, and a language other than English needs a hand-made `medusa_search_<language>` configuration in each database (not part of any migration). Under the default configuration all languages work as described in T9; only English-like stemming is applied to Latin text.
- **CI does not run the backend's integration tests.** The decision-bearing spec that merges, `search-locale-assumptions.spec.ts`, checks the Medusa behaviour this ADR depends on on the stock configuration (5 tests, about 20 s plus the runner's startup), and T17 decides whether the backend's `test:integration:http` joins CI; until then it is run by hand (the file's header has the command).
- The prototype's spec is the acceptance suite for M3 and M6: T1 to T10 pass on all five combinations, and it also shows how to run a test that changes data when an index lives outside the test database.

## Spec changes

- §6.2 (`modules/meilisearch-search`): "One index per locale" becomes "one index per locale and per version (`<name>_v<N>__<locale>`), created on the first write of a locale; `search_options.locales` selects it, one locale per query".
- §8.5 and §10.5: replace "one Meilisearch index per locale. **[Risk]** ... part of the M0 spike" with "validated by ADR 0002". Add that on `search-postgres` the default is one multilingual index (`search_text`), facets are ids, and the locale reaches the search through a `/store/search` middleware that reads `req.locale`.
- §6.2 / §14: the backend test row's "search provider per locale" is the S2 acceptance suite; add the assumptions spec.
- G7 and §17 (M3, M6): M3's exit adds the Postgres index (A'), the transform, the middleware and the `translation.*` events; M6's adds the B provider with its list of changes above. G7 holds without a restart for B and A'.
- Risk table ("Search Module is new; ... per-locale indexing undocumented"): "validated by ADR 0002; the Medusa defects and gotchas it found are listed there".
- Add to the sources: the Search Module's provider reference, and Meilisearch's `localizedAttributes` page.
