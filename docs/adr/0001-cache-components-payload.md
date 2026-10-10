# ADR 0001: Cache Components with the embedded Payload admin

| | |
|---|---|
| Status | **Accepted** 2026-10-10 by the owner (Stephanos): keep Cache Components on. The S1 session's two other readings of the plan's PASS rule (under "Decision", items 2 and 3) stand until the owner changes them |
| Date | 2026-10-10 |
| Spike | S1, [docs/plans/M0.md](../plans/M0.md) §6 |
| Versions | Next 16.4.0 (Turbopack), Payload 3.90.2, React 19.3.0, Node 22.22.0, Chromium 1248 through Playwright 1.64.0 |
| Prototype | commit `dbfec6e` on `claude/busy-fermat-3wb1z5` (D13: the spike code does not merge; the next commit removes it from the tree). PRs merge with a merge commit (plan G2), so `dbfec6e` stays in `main`'s history. Reproduce: SETUP.md, "Cache Components × Payload admin (S1)", row "Reproduce" |

## Context

SPEC §8.3 puts the storefront on Cache Components (`cacheComponents: true`, `partialPrefetching: true`, `'use cache'` for catalog and CMS reads). Payload's admin is embedded in the same Next app, and Payload's docs say full compatibility with Cache Components "is not guaranteed". S1 asks: can both stay on, and do Local API reads inside `'use cache'` work with tag revalidation?

## Options

1. Keep both settings on, change nothing in Payload's generated files (the current state of `main`).
2. Keep them on and patch the generated admin files. Three sets were tried: **W1** (the plan's: `export const instant = false` and `await connection()` in `admin/[[...segments]]/page.tsx`), **W2** (the same idea in `(payload)/layout.tsx`), **W3** (page, layout and `not-found.tsx`, `generateMetadata` included).
3. `partialPrefetching: false`.
4. `experimental.instantInsights.validationLevel: 'manual-warning'` (Next's documented control of the dev-only validation).
5. The fallback: `cacheComponents: false`, `unstable_cache` in `lib/cache.ts`.

## Tests and results

One Playwright suite (19 checks, `spike/s1/s1.spec.ts`) against its own empty database (`payload_s1`) and its own server on :8000, so the create-first-user form is the first thing it meets. Each column rebuilds (start) or restarts (dev) on a fresh database. Seven `next start` columns and the dev columns below; every number is from the last run of that column.

The 19 checks: first-user form → admin; log out through the nav link and log in; a page in two languages, switched in the selector without a reload, published; an edit and a publish; an image uploaded to `media` and opened from the list without a full reload; the same image chosen in an upload field's drawer without a full reload (needs the prototype's `heroImage` field); the list view paginated without a full reload; `GET /api/pages` 200; the cache checks (below); draft isolation (below); the storefront's test routes open in a browser; **zero browser-console errors or warnings** (a failed request to another host is excused: the cloud's proxy blocks the admin's Gravatar avatar, D18; `ERR_ABORTED` prefetches are not failures).

### `next build && next start`: every column passes all 19

| partialPrefetching | Edit to generated files | Build | Suite |
|---|---|---|---|
| on | none | exit 0, 37 s | **19/19**, 19 s |
| on | W1 | exit 0, 38 s | 19/19 |
| off | none | exit 0, 36 s | 19/19 |
| off | W1 | exit 0, 40 s | 19/19 |
| on | W2 | exit 0, 37 s | 19/19 |
| on | W3 | exit 0, 36 s | 19/19 |
| on | none, `manual-warning` | exit 0, 35 s | 19/19 |

No build prints a blocking-route, "Uncached data was accessed outside of `<Suspense>`" or sync-I/O error. `/[market]` and `/admin/[[...segments]]` are `◐`. A request for `/` gives 200 with `<html lang="el-CY">`, a pending Suspense boundary (`<!--$?-->`, `<template id="B:0">`) and its fallback in the shell; with Medusa stopped the streamed part falls back to client rendering (`$RX`) and the status is still 200 (SETUP.md T12 item 2). `/admin/nope` answers 200 (accepted by the plan, `/admin` is noindex). `GET /api/pages` answers 200.

### `next dev`: functional checks pass, the console does not

| partialPrefetching | Edit | Runs | Result | Console (judged messages, one run) |
|---|---|---|---|---|
| on | none | 2 | 18/19 both; only the console check fails | 16–17 `new Date()` while prerendering, 1–2 `crypto.getRandomValues()`, 1 "Maximum update depth exceeded" (+1 `pageerror`), once also "instant navigation" and "URL data in `generateMetadata()`" |
| on | W1 | 1 | 18/19 | 7 `new Date()`, 6 "Maximum update depth" |
| off | none | 1 | 18/19 | 15 "Maximum update depth", 3 "uncached data … navigation", 2 "runtime data in `generateMetadata()`" |
| off | W1 | 1 | **fails at the media drawer** (the same in the 2 earlier runs) | – |
| on | W2 | 1 | 18/19 | 17 `new Date()`, 9 "Maximum update depth", 1 "instant navigation", 1 `generateMetadata()` |
| on | W3 | 1 | **fails at the media drawer** (two earlier runs on a previous suite: 18/19) | `new Date()` errors gone; "Maximum update depth" stayed |
| on | `manual-warning` | 1 | 18/19 | 12 "Maximum update depth", 7 `new Date()` |
| **off (Cache Components off)** | none | 3 | **10/10 admin checks, 3 of 3 runs** | **0 judged messages** |

Read the last row with the others: the same admin, the same suite, in dev, with only `cacheComponents` off (`globalNotFound` off and the storefront's `use cache` pages set aside, because they cannot compile without it). The dev errors are therefore not Payload's alone, and not the suite's. The "Maximum update depth exceeded" loops are in `/admin/collections/media/<id>` (the document view) and `/admin/logout`; they appear in every dev column with Cache Components on and are the likely reason the media drawer times out now and then. None of them appears in `next start`.

`⨯ turbopackServerFastRefresh` in the banner is `withPayload` setting `experimental.turbopackServerFastRefresh: false` (its comment: "Server fast refresh breaks HMR"). Dev only; no effect on a build.

### Cache behaviour (`next start`, every column)

- A read of `pages` through the Local API inside `'use cache'` (through `lib/cache.ts`'s `cached()`) serves the published titles; after a tag invalidation the first request runs the loader once, the next two requests are hits (same run id; the loader counter does not move). In the 200-request run, 100 public requests ran the loader **once**.
- A published edit made in the admin runs the `pages` `afterChange` hook, which calls `revalidateTag('pages:<locale>', 'max')` and `revalidateTag('payload:pages', 'max')` inside Payload's REST route handler. With `'max'` (stale-while-revalidate) request 1 shows the old text and starts the refresh, which took about 300 ms (probe: 98 ms to request 1, fresh at 394–422 ms). Request 2 after a 500 ms pause is fresh. Two requests back to back would still show the old text; the plan's "within 2 requests" is read with that pause.
- `revalidateTag(tag, { expire: 0 })` from a route handler: the next request is fresh; before the call the cache still serves the old title (the hook was skipped with a header, so only the route handler acted).
- Not exercised: `revalidateTag` outside a Next request (a Payload script, `payload migrate`). Next's docs say it needs a request context, and the prototype's hook wraps it in a `try`/`catch`; no script was run to confirm that it throws.

### Draft isolation (GHSA-3w37-wq28-93x7, fixed in 16.4.0)

A page published as `PUBLIC-<stamp>` whose newest version is a draft titled `DRAFT-MARKER-<stamp>`; `draftMode()` is read **inside** the cached function (the pattern of the advisory). 200 concurrent requests, alternating with and without the draft cookie, on a cold cache (after `expire: 0`) and on a warm one:

| Run | Public requests | With the draft marker | With the public title | Draft requests | With the draft marker | Non-200 |
|---|---|---|---|---|---|---|
| cold | 100 | **0** | 100 | 100 | 100 | 0 |
| warm | 100 | **0** | 100 | 100 | 100 | 0 |

Draft requests are not cached (the loader ran 200 times for 200 draft requests, as the `use cache` docs say).

### The tests can fail (mutations, `next start`, base column)

| Mutation | Test that failed |
|---|---|
| the preview read always asks for drafts | "200 concurrent requests, mixed, on cold cache" (public responses carried the marker) |
| the `pages` hook revalidates nothing | "an admin edit shows within two requests" |
| the published read bypasses the cache | "a read … inside use cache … the second request is a hit" (run id and loader counter moved) |
| the published read with `cacheLife` all zero | the **build** (the read cannot be prerendered: criterion 1's guard) |

### Found on the way (harness, not product)

- A deep link to `/admin/logout` gave a console 400 on `POST /api/users/logout` in 2 of 6 runs; the nav link gave 0 of 6. The suite logs out through the link. (T09 saw the 400 and called it harmless.)
- After "Publish", the "updated successfully" toast of the *previous* save can still be on screen; the suite waits for the PATCH response instead.
- `payload migrate` exited 0 without running, once in the first helper; the helper now repeats until the table exists (SETUP.md T14 item 4).

## Decision

**Accepted: keep `cacheComponents: true` and `partialPrefetching: true`, with no edit to Payload's generated files and no change to the settings in `next.config.ts`.**

Why: in production mode (`next build && next start`, what CI runs) every column passes all 19 checks with a clean console, the base column included, so none of W1–W3, `manual-warning` or `partialPrefetching: false` is needed. In dev none of them gives a clean console. The dev runs are too few to rank them: `partialPrefetching: false` with W1 failed at the media drawer in 3 of 3 runs, W3 failed there in its last run (its two earlier runs, on a previous version of the suite, passed), and `partialPrefetching: false` alone passed the drawer but logged 15 "Maximum update depth" errors and "uncached data" errors. None is adopted. The login problem the plan names for `partialPrefetching` plus instant navigations (PR #16020) did not appear.

**How the plan's PASS rule is read.** The plan's text is unchanged; the rule needs, in one column, "the admin suite passes with zero browser-console errors … in both dev and start". This ADR applies three readings; the first is the owner's decision, the other two were made by the S1 session:

1. **Criterion 2, dev.** In `next dev` every column with Cache Components on logs console errors (table above), so read to the letter the verdict is **FAIL**, and §6 sends S1 to the fallback. The fallback was not applied, so the rule is read for production mode and the dev errors are a recorded limitation. Reasons: (a) the errors are Next's dev-only prerender validation and a dev-mode React loop that surfaces in Payload's document and logout views, absent from `next start`; (b) all 18 functional checks pass in the base dev column, so the admin works while it logs them; (c) the fallback gives up `'use cache'` for the whole storefront (SPEC §8.3, cart and checkout dynamic) to quieten the admin's dev console.
2. **Criterion 2, excused messages.** A failed request to another host (the admin's Gravatar avatar, blocked in the cloud) and `ERR_ABORTED` prefetches are not counted.
3. **Criterion 4, "fresh within 2 requests".** With `'max'`, request 1 may be stale and starts a refresh of about 300 ms; request 2 after a 500 ms pause is fresh. Two requests back to back still show the old text.

**The dev limitation, and what to do about it.** The source of the dev `new Date()` errors was not traced, and no upstream issue is linked (the plan's #18065 is the nearest known one, not confirmed to be this). So:

- On a minor bump of `next` or `payload`, open the admin pages in `next dev` once and look at the console; if it is clean, drop this limitation and say so here.
- File or link the upstream issue when someone with access can.
- The suite's console check ran across the whole admin flow, so it was not measured whether the storefront's own pages are clean in dev. Check them in `next dev` at M1.
- Until then, when the admin's console matters, use `pnpm --filter @shopblok/storefront build && … start` (37 s) or expect the dev noise. The Payload admin is not where the storefront's day-to-day dev loop lives.

### The fallback (not chosen)

Kept for reference, if the dev limitation ever outweighs `use cache`:

1. `next.config.ts`: `cacheComponents: false`, drop `partialPrefetching`, and `experimental.globalNotFound` needs its own check (the page imports a `use cache` function).
2. `src/lib/cache.ts`: `run` becomes `unstable_cache(load, [name], { tags, revalidate })`; `src/lib/markets/cached-market-map.ts` (the other `"use cache"`) the same; their tests change.
3. Revalidation stays `revalidateTag(tag, 'max' | { expire: 0 })`; cart, checkout and account render dynamically.
4. SPEC §8.3 is rewritten; Q14 and the risk-table row change.
5. Splitting Payload into its own app is not part of M0 and is not needed by anything here.

The baseline row shows the dev admin would be clean.

## Consequences

- `lib/cache.ts` works with the Local API as it is. **Tags are fixed when `cached()` is called**, so a tag per language (`pages:<locale>`) needs one wrapper per language (the prototype used a factory) or `cached()` taking tags from its arguments. SPEC §8.3 asks for global tags, which `cached()` already supports (`payload:pages` was revalidated alongside); per-language tags are not needed for M0.
- Payload hooks revalidate with `revalidateTag(tag, 'max')` (content) or `{ expire: 0 }` (price and stock webhooks, SPEC §8.3); `updateTag` and `refresh()` are Server Action only (Next's docs; `updateTag` was not tried from a Payload hook). Wrap the call: it is expected to throw outside a request (not confirmed, see "Not exercised" above).
- **Not tested on the deployment target.** SPEC §8.1 and §10.8 put the storefront and Payload on Vercel. Every result here is from one self-hosted Node process (`next start`, the in-memory cache); Vercel uses its own cache handler across serverless instances, and SPEC §8.3's line that Vercel propagates `revalidateTag` across functions is not tested by S1. M7's deployment check should repeat three things on a Vercel preview: a published edit is fresh by request 2 after a pause, `{ expire: 0 }` is fresh on the next request, and the 200-request draft test shows 0 leaks. If T17 step 4 writes those as Playwright specs, M7 can point them at the preview with `E2E_BASE_URL` (`playwright.config.ts` reads it). If one fails there, this ADR is reopened.
- Under `[market]` the page shell regenerates at most every 30 s whatever a content entry's `cacheLife` (the market map's entry sets it, SETUP.md T10), so a tag invalidation and the 30 s shell are independent clocks.
- A route handler that reads process state must call `connection()` or Next prerenders it (the counter route did).
- Renovate PRs for `next` and `payload` run `e2e-smoke`, which logs in and writes a localized page in production mode (T16). The extra S1 coverage that is useful there (media upload and open, the list view, a console with no errors) is a T17 item, with the draft-isolation test and the tag checks that encode this decision (plan T17 step 4; the suite is `spike/s1/s1.spec.ts` in `dbfec6e`). The first-user form needs an empty database and its own server (SETUP.md T16 item 1) and stays in the prototype.
- Admin 404s answer 200 (`/admin/nope`); accepted.

## Spec changes

- §8.3: add that the Payload hook uses `revalidateTag(tag, 'max')` and the webhook `{ expire: 0 }` (both verified under `next start`, not yet on Vercel) and that tags are global as written. Keep the rule `lib/cache.ts` states for drafts: `draftMode()` is read outside the cached function and `isEnabled` is passed in as an argument, so it is part of the cache key. S1 tested the opposite pattern on purpose (a read inside the cached function, the advisory's pattern) and 200 concurrent requests leaked nothing on 16.4.0, on one process; that is evidence the advisory's fix holds, not a pattern for M4's preview code to copy.
- §8.3 / Q14 / risk table ("Payload × Cache Components"): replace "validated by an M0 spike" with "validated by ADR 0001: kept on; production mode clean, `next dev` logs console errors in the admin". The fallback is not taken, so §8.3 keeps `'use cache'`.
- §17: M7's exit adds the three Vercel checks under "Consequences"; M1's adds a console check of the storefront's own routes in `next dev`.
- No change to §8.1.
