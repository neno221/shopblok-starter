# ADR 0003: Payload preloads 42 languages, and the `markets` global decides which the admin offers

| | |
|---|---|
| Status | **Accepted** 2026-10-10 (T17). S3's verdict was **PASS** as the plan defines it, with the reading of L7 under "Decision". S3 left six readings of the plan's rules to the owner (R1 to R6 under "Decision", silence means the defaults stand); the T17 prompt changed none, so all six stand as written. R6: `payload-locales.spec.ts` stays in `e2e-smoke` |
| Date | 2026-10-10 |
| Spike | S3, [docs/plans/M0.md](../plans/M0.md) §6 |
| Versions | Payload 3.90.2 (`@payloadcms/db-postgres` 3.90.2, drizzle-orm 0.45.2), Next 16.4.0, PostgreSQL 17.11, Node 22.22.0, Playwright 1.64.0 (Chromium) |
| Prototype | commit `caf63e7` on `claude/sweet-brown-e07eio` (D13: the spike code does not merge; the next commit removes it from the tree). PRs merge with a merge commit (plan G2), so it stays in `main`'s history. Reproduce: SETUP.md, "Payload locale preloading (S3)", row "Reproduce" |

## Context

D17 says a shop picks its regions, currencies and languages in one place each and they work at once. For Payload that means the admin can write content in any language a shop might sell in, with no migration when a market opens. Payload's locale list is fixed when the server starts and is a Postgres enum, so the choice made in T09 was to **preload 42 languages** (the EU's 24, the 36 languages Medusa has a locale for, and seven more; `apps/storefront/src/payload/locales.ts`) and let `localization.filterAvailableLocales` show the admin only the languages of the countries enabled in the `markets` global, and English.

S3 asks whether that stays cheap, whether the filter restricts the admin correctly and dynamically, and what a language outside the list costs.

What Payload 3.90.2's source says (checked before building anything; the plan's "Known going in" holds, with additions):

- `filterAvailableLocales({ locales, req })` is called by `applyLocaleFiltering`, from the admin's root layout, from the admin page (`views/Root`), from the list and document server functions, and from the version view. It filters the admin's selector, never the REST or Local API.
- `views/Root` redirects to the default locale (or the first allowed one) when `req.locale` is not in the filtered list: that is what happens to `?locale=fr` while `fr` is off.
- **Added by S3:** `initReq` returns a shallow copy of the request with a copy of its `context` to every caller, and the layout and the page cache their requests under different keys. A promise kept in `req.context` is therefore never seen by the next caller (the finding behind L7 below).

## Options

- **A. Preload the full list, filter by `markets`** (T09's choice, tested here). One `_locales` enum of 42 values, plus three more enums with the same values (`enum__pages_v_published_locale`, `enum_markets_countries_languages`, `enum_markets_languages_code`).
- **B. Preload each brand's planned languages only** (the plan's fallback for L9 or L1). A new language is a migration, and D17's "no migration to add a language" ends for Payload.
- **C. A custom admin locale selector** that reads `markets` (the plan's fallback for L2 to L6), with `filterAvailableLocales` kept as a safety net.

B and C were not built: A passes.

## Tests and results

One prototype app ran the same code with `S3_LOCALES=four` for the 4-language config (`en, el, de, fr`), against throwaway databases in the compose Postgres (`payload_s3_*`, never `payload`). Results are from the last run of each test; the admin was a production build (`next build && next start`).

| # | Test | Result |
|---|---|---|
| L1 | `migrate:create` on the full list; `migrate` on an empty database | **Pass.** See the table below. The regenerated migration is **byte for byte** T09's committed `20261009_115513_initial.ts` (the snapshot differs only in its random `id`) |
| L2 | `markets` enables `el` and `en`: the selector shows exactly those | **Pass.** `en, el` |
| L3 | enable `de`, reload | **Pass, no restart.** `en, de, el` (config order, not save order); the server's PID was the same before and after (15758) |
| L4 | only `el` | **Pass.** `en, el`: English is forced |
| L5 | `markets` empty | **Pass.** `en`; the filter never returns `[]` (the unit test covers the empty list); the admin loads |
| L6 | `?locale=fr` while `fr` is off | **Pass.** Four URLs (list view, create view, the `markets` global view, the dashboard) answer 200 and end on `?locale=en`; a plain page load afterwards (Payload had stored `fr` as the admin's language) works; with `fr` on, the same URL stays. The console held only the blocked Gravatar request (D18) |
| L7 | at most one `markets` read per admin request | **Fail on T09's implementation, pass after the fix** (below). Read as: per admin page load (one HTTP request) |
| L8 | `GET /api/pages?locale=fr` while `fr` is off | **Pass: 200**, as a visitor and as an admin. The REST API does not look at the locale at all: `?locale=zz` and `?locale=all` also answer 200. The filter is the admin's selector only |
| L9 | full-list p50 at most 1.2 times the 4-language p50 | **Pass, with room.** 18 request and query measures, ratios of medians 0.91 to 1.06 (below) |
| L10 | add a language outside the list to a database with content | **Pass.** Runbook in SETUP.md, "A language outside the list" |
| L11 | remove a language that has content | **Fails, as expected, and worse than expected** (below): add-only |

The L2 to L6 and L8 checks are now `apps/storefront/e2e/payload-locales.spec.ts` (7 tests, its own Playwright project that runs after the others and puts `markets` back). Run against `next dev` as well: the first run on a dev server that had never compiled the admin failed in the spec's setup hook within a second (I did not capture the message), and the two runs after it passed 7 of 7, one of them on a restarted dev server.

### L1: migration cost

| Config | `migrate:create` | Migration file | Snapshot | `migrate` (the migration itself; the CLI as a whole) | Tables | Enums with codes |
|---|---|---|---|---|---|---|
| 42 languages | 2.9 s | 16,473 B | 57,479 B | 129 ms (4.4 s) | 19 | 4 × 42 |
| 4 languages | 3.0 s | 15,561 B | 55,351 B | 130 ms (4.4 s) | 19 | 4 × 4 |
| 42, with the test collection (32 localized fields) | 2.6 s | 24,592 B | 89,478 B | 161 ms (7.0 s) | 27 | 5 × 42 |
| 4, with the same collection | 2.7 s | 23,452 B | 86,818 B | 124 ms (6.7 s) | 27 | 5 × 4 |

The 38 extra languages add 912 bytes to the migration (four enums of 42 values each, instead of 4). No table has a column per locale: a `<table>_locales` table holds one row per language that has content.

### L7: how often the filter runs, and what shares the read

Payload makes **three** filter calls for one hard load of an admin page (measured on the list view, the dashboard and the create view), from one HTTP request: `RootLayoutContent` twice and `RootPage` once (found with an unmangled build). A soft navigation makes one (the page); switching the selector makes two. Each call has its own copy of `req`. Counts per page load, by the way the read of `markets` is shared:

| Way to share the read | list view | dashboard | create view | soft navigation (Media) | selector switch |
|---|---|---|---|---|---|
| T09's: a promise in `req.context` | 3 calls, **3 reads** | 3 / 3 | 3 / 3 | 1 / 1 | 2 / 2 |
| a `WeakMap` keyed by `req.headers` | 3 / 3 | 3 / 3 | 3 / 3 | 1 / 1 | 2 / 2 |
| React's `cache()` in the module | 3 / 3 | 3 / 3 | 3 / 3 | 1 / 1 | 2 / 2 |
| React's `cache()`, one function on `globalThis` | 3 / **2** | 3 / 2 | 3 / 2 | 1 / 1 | 2 / 2 |
| **a promise on `globalThis` kept for 2 s** | 3 / **0 or 1** | 3 / 1 | 3 / 1 | 1 / 1 | 2 / 1 |

Why the first four do not work: the layout and the page each load **their own instance of the module** (two `Math.random()` tags in the module showed two instances), so a module variable and a module-level `cache()` are per instance; `req.headers` is a **new Proxy per `headers()` call** (the underlying `Headers` is shared, which is how the counters attributed calls to requests, but the proxy is not a usable key); and React's `cache()` scope, even from one function on `globalThis`, covered two of the three calls. What the calls do share is the process, so the memo is on `globalThis`, keyed by time.

On the final code (no counters; Postgres's scan statistics for the `markets` table around one hard load): list view 0, dashboard 1, create view 1, `markets` view 1 reads; with the time set to 0 (no sharing), 1, 3, 3, 3.

### L9: what 42 languages cost

50 documents of a collection with 32 localized fields (a title, a slug, two textareas, 24 text fields, two SEO fields, and a 6-row array with two localized fields), each written in four languages and published (four versions each). The same code, the same data, `S3_LOCALES=four` on one of the databases. Three rounds in rotated order; the table shows the median over the rounds of each run's p50. A third database, configured like the first, is the control: it shows how far two identical configs differ.

| Measure (p50) | 42 | 4 | 42, control | 42 / 4 | 42 / control |
|---|---|---|---|---|---|
| `findByID`, four languages pooled, 400 calls per run (ms) | 3.03 | 3.10 | 3.02 | **0.98** | 1.01 |
| `findByID` with `locale: all` | 2.95 | 3.01 | 3.16 | 0.98 | 0.93 |
| `findByID` at depth 1 | 3.17 | 3.01 | 2.97 | 1.05 | 1.07 |
| `find`, 50 documents | 39.9 | 42.2 | 44.6 | 0.95 | 0.90 |
| `find` with a `like` on the title | 15.9 | 15.0 | 15.3 | **1.06** | 1.04 |
| `update` of one field | 104.3 | 104.6 | 107.1 | 1.00 | 0.97 |
| versions of the document | 13.9 | 15.3 | 14.4 | 0.91 | 0.97 |
| admin edit view over HTTP (`el`), 100 loads per run (ms) | 49.8 | 51.4 | 51.2 | **0.97** | 0.97 |
| admin edit view (`en`) | 45.7 | 46.5 | 47.1 | 0.98 | 0.97 |
| admin list view | 63.6 | 61.1 | 62.3 | 1.04 | 1.02 |
| admin `markets` global view | 41.2 | 41.8 | 42.0 | 0.98 | 0.98 |
| admin edit view in a browser, `goto` to the last field, 30 loads (ms) | 309.6 | 326.5 | 314.8 | **0.95** | 0.98 |
| REST `GET /api/s3-rich/:id` | 7.57 | 7.74 | 7.56 | 0.98 | 1.00 |
| REST `GET /api/pages` (public) | 4.35 | 4.52 | 4.35 | 0.96 | 1.00 |
| `getPayload` initialisation (ms) | 36.3 | 37.4 | 37.2 | 0.97 | 0.98 |
| importing the config (ms; module loading) | 1,079 | 994 | 967 | 1.09 | 1.12 |

Over the 18 request and query measures (the table shows 16) the ratios of medians run from 0.91 to 1.06, and the largest single round is 1.13 (`findByID` at depth 1). Loading the config is 1.09 (it is module loading, not one of the 18). The control differs from the first config by up to 10 percent, so the measurement cannot see a difference smaller than that: the preload costs less than the noise. The one place the 42 shows is size: the admin pages are 3.7 KB (2 percent) larger, because the client config carries the `markets` global's two selects of 42 options each. Memory was not measured.

A plain HTTP client gets only the static shell of an admin page; it renders the dynamic part when it sends the browser's fetch-metadata headers (`Sec-Fetch-Dest: document` and the others). The HTTP rows above send them. Anyone who load-tests the admin needs to.

### L10: a language outside the list

The plan's example, `ga`, is **already in the 42** (it is one of the EU's 24). The run used Icelandic (`is`), which no list has, on a database with 20 pages in four languages (80 locale rows, 80 versions, 200 version-locale rows).

1. One line in `locales.ts` (`EXTRA_LANGUAGES`), then `payload migrate:create add-icelandic`. The generated `up` is four statements, one per enum: `ALTER TYPE "public"."_locales" ADD VALUE 'is'` and the same for the other three. Nothing is rewritten.
2. `payload migrate`: **4 ms**. The SQL touches only the four enums; the data's checksum and the counts are unchanged, and the `_locales` enum has 43 values.
3. `payload generate:types` adds `'is'` to the unions in `payload-types.ts` (three places); `generate:importmap` changes nothing; `migrate:create --skip-empty` afterwards creates no file.
4. In the admin: `markets` with an Icelandic country shows *íslenska (is)* in the selector; a page was written in it through the admin form (publish: 200), `GET /api/pages/:id?locale=is` returned it, and `?locale=all` listed `en` and `is`.
5. `locales.test.ts` failed, as it should have: it asserted `toHaveLength(42)`. It now compares the list with the newest migration (below).
6. **Order of deployment.** New code against a database that has not been migrated: saving `markets` with an Icelandic country, or a page in `is`, answers HTTP 500 ("An unknown error occurred."), and nothing else is affected (reads fall back to English). Old code against the migrated database works. So the migration goes first, then the code.
7. A `markets` language row needs a Medusa locale (D8, one of Medusa's 51 codes). Medusa has none for Icelandic; the run used `en-US`. A language Medusa does have is as in D17.

### L11: removing a language that has content

On a copy of the L10 database, with Icelandic content in 2 pages, 2 version rows, the `markets` country and the `markets` language:

- The migration Payload generates for the removal (the `down` of the one above) recreates each enum without the value. `payload migrate` fails: `invalid input value for enum _locales: "is"`. The transaction rolls back: the checksum, the counts and the 43 values are as before.
- **Code that no longer lists the language, on a database that still has its content, keeps working but loses data.** Reads and the admin work; `?locale=all` still returns the Icelandic text; an unknown `?locale=is` is answered with English. Saving the `markets` global fails with "This field has an invalid selection" until Icelandic is taken out of it. And **an ordinary save of a page in English deleted that page's Icelandic row** (`pages_locales` rows for `is`: pages 21 and 22 before, 22 after; with the language listed, both stay). The cause is in Payload (a save writes the locale rows of the languages it knows and removes the others); I did not read the code, only saw the rows go.
- The safe removal, which worked: take the language out of `markets`, delete its content (`pages_locales`, `_pages_v_locales`, `_pages_v.published_locale`, `media_locales` rows), then `migrate:create` and `migrate` (65 ms, 43 to 42 values). That is deleting a language's content.

### The tests can fail

Each mutation was applied to the real file, only the tests that should notice it were run, and the file was restored. The end-to-end rows rebuilt the app (`next build`) for each.

| Mutation | Unit tests (`src/payload`, 55; 59 after the review fixes) | `payload-locales.spec.ts` (production build) |
|---|---|---|
| the memo is a module variable, not on `globalThis` | 1 failed (a second copy of the module reads again) | not run |
| no time to share a read (0 ms) | 4 failed | the read count per page load went from 0, 1, 1, 1 to 1, 3, 3, 3 (the probe; the spec cannot see a read count) |
| the read never expires | 1 failed | **not caught**: every save in the spec clears the memo, so it never grows old. Only the unit test sees it |
| the memo is shared by every Payload instance | 1 failed | not run |
| a failed read is kept | 1 failed | not run |
| the `markets` save does not clear the read | 1 failed | L5 failed in the full run (the setup's login had just filled the memo), and the dedicated "very next page" test failed on its own |
| the filter offers every language | not a unit mutation | L5 failed |
| English is not forced | not run | L4 failed; L5, L2 and L3 passed |
| a language is added to `locales.ts` without its migration | 1 failed (the list is not the newest migration's enum) | not run |
| a language beyond the 42 is dropped from `locales.ts` with a regenerated migration | 1 failed (a saved migration had it) | not run |
| a save does not put its languages in the memo | 3 failed | the "very next page" test is the check (not rerun for this row) |
| a document without `countries` is trusted | 1 failed | not run |
| the filter reads through the shared memo inside a transaction | 1 failed | not run |
| a language is dropped from `locales.ts` (`ga`) | 3 failed (at least 42; the EU's 24; the enum) | not run |

## Decision

**Verdict: PASS**, applying the plan's rule: L1 to L8 and L10 pass and L9 is within budget. L7 passes only after a change to T09's implementation, which is a reading of the rule (R1). No fallback applies, so D17 is **not** amended: Payload keeps preloading 42 languages, and a language outside the list costs one line and one 4 ms migration.

1. **Keep option A**: preload the full list and filter the admin by `markets`. No custom selector (C) and no per-brand list (B).
2. **The filter shares one read of `markets` for 2 seconds, on `globalThis`**, and a save of the `markets` global puts the saved languages into it (`hooks.afterChange`), so the page that follows a save already shows them. T09's `req.context` memo is replaced (it shared nothing); the shared read does not take the caller's `req`. The memo is written through and not just cleared, because Payload commits the save's transaction after its `afterChange` hooks and a page that read in between would otherwise keep the old list (a rollback after the hook leaves the wrong list for 2 seconds at most). Called from a write (the transaction is open, once `localizeStatus` is on), the filter reads with that request and shares nothing, so a write does not wait for a second connection while it holds the first. Another server process is up to two seconds behind a save.
3. **Locales are add-only.** A language is switched off in `markets`, never taken out of `locales.ts`. `locales.ts` says so, and `locales.test.ts` now (a) requires at least the 42, (b) requires the list to have the same languages as the `_locales` enum of the newest saved migration, so a language added without its migration fails `pnpm test`, and (c) requires every language in any saved migration's enum to still be in the list, so a language cannot be dropped together with a regenerated migration.
4. **The storefront enforces its markets; the API does not.** The filter touches the admin selector only (L8): the REST and Local API serve any preloaded locale, whatever `markets` says, and do not even reject an unknown one. A page of a language that is switched off is still readable at `/api/pages?locale=…`. M4's content reads must take their locales from the market map, and nothing may treat "switched off in `markets`" as "hidden".
5. **The runbook** is in SETUP.md, "A language outside the list".

**Readings of the plan's rules, confirmed by T17 (the owner changed none of them, so each default stands; the rules were not changed):**

- **R1. L7.** The plan says "at most 1 `markets` read per admin request (counter in `req.context`)". The counter cannot live in `req.context` (each call has its own), T09's `req.context` memo read three times per page load, and I read "admin request" as the page load (one HTTP request, three filter calls). The fix (decision 2) makes it at most one. If you would rather have no staleness at all, the options are no memo (three reads of a one-row global per page; I did not time the two extra) or a memo tied to the request, which Payload gives no handle for. Default: as built.
- **R2. L9.** The budget is applied to each of the 18 request and query measures, with "the admin edit-view load" read as the server's time for a browser navigation (HTTP, 100 loads) and a browser's time to the last field (30 loads). The 4-language config is the same code and data with `S3_LOCALES=four`. The content model is a stand-in with 32 localized fields; M4's will differ. Default: as measured.
- **R3. L2 to L6 and mode.** They run against a production build, with `markets` saved over the REST API (what the admin's form sends) and not through the form's own fields; the same spec passes under `next dev` once the admin is compiled (above). Default: as measured.
- **R4. L10's example.** `ga` is already preloaded, so the run used `is`. Default: as recorded.
- **R5. L11's policy.** "Add-only" is enforced by a comment and two tests, not by a CI check that no migration removes an enum value. Default: as built.
- **R6. The new e2e project.** `payload-locales.spec.ts` runs in CI's `e2e-smoke` (about 20 s) after the other suites and restores `markets`. T17 step 4 kept it there: it needs the same production build, the bootstrap admin and the `markets` global that `e2e-smoke` already has, and a second job would repeat all three. To drop it, remove the `locales` project from `playwright.config.ts`.

## Consequences

- **M4** builds the content model on the full list: a localized field costs a row per language that has content and nothing for the languages that do not. `markets` is the one switch for what the admin offers; a content read must take its locale from the market map, not from the request (decision 4).
- **A shop with a language outside the 42** follows the runbook once, before it enables the language, and deploys the migration before the code.
- **`payload migrate:create` writes the removal of a language without complaint.** The only guard is the comment and the tests; whoever removes a language from `locales.ts` gets a migration that fails or, worse, a Payload that deletes content on the next save (L11).
- **The admin's `markets` global carries 42-option selects**, which add 3.7 KB to every admin page. Nothing else grows with the list.
- **Any code that wants the enabled languages in the admin's process** should read them through `filterAvailableLocales`'s memo, not with a second `findGlobal` per request.
- **The 2-second memo is one server process.** On Vercel each instance has its own; a save clears the one that handled it, and the others catch up within two seconds of their own running time (the clock is `performance.now()`, the one Cache Components allow in a render; `Date.now()` is not; a process that is frozen between requests may count its freeze as less than it was, which stretches the two seconds by at most the time it then runs).
- **A write that calls the filter reads `markets` inside its transaction.** Nothing calls it from a write today (Pages has no `localizeStatus`); M4's content model will, and its writes then read the one-row global each time.
- **Not tested:** Vercel; a separate worker process; the `markets` form driven by clicking its fields; the version view and the experimental `localizeStatus` publish menu; Windows; more than one admin editing at once.
- The prototype's scripts are the model for any later benchmark of the admin: `git show caf63e7:apps/storefront/spike/s3/<file>`.

## Spec changes

- §7, Localization: "a preloaded list of about 35 languages" becomes "42 languages (the EU's 24, the 36 languages Medusa has a locale for, and seven more)"; the sentence "the config's `defaultLocale` must always stay in that list, or the admin crashes (reported issue)" becomes "the admin falls back to the first allowed locale since Payload 3.28; `filterAvailableLocales` still always offers English"; add "the list only grows (ADR 0003, L11)" and "`filterAvailableLocales` filters the admin only: the REST and Local API accept every preloaded locale, so the storefront enforces its markets".
- §7 "Why preload" and §8 (the line "Languages outside Payload's preloaded list need a one-line config change and a migration", line 585 of v0.5): "one line in `locales.ts` and one saved migration (four `ALTER TYPE … ADD VALUE`, milliseconds), deployed before the code; see SETUP.md".
- G7 (line 55) and §17 (the risk row "Payload locales are fixed at startup"): "validated by ADR 0003: 42 languages cost nothing measurable; a language outside the list costs one migration". G7 holds without code for the 42; outside them it takes the runbook.
- §14: the test table gets `e2e/payload-locales.spec.ts` (the admin's selector follows `markets`) and the migration-sync test in `locales.test.ts`.
- Add to the sources: Payload's migrations page (`migrate:create`) and its localization page.
