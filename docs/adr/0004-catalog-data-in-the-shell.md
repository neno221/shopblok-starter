# ADR 0004: Catalog pages read their data in the static shell, so a backend outage serves the last good page or a 5xx, never a 200 error page

| | |
|---|---|
| Status | **Accepted** 2026-10-16: S4 passed, so D36 holds as the owner (Stephanos) chose it on 2026-10-14 ([M1 plan](../plans/M1.md) §1). The six readings under "Decision" were made by the S4 session and stand until the owner changes them |
| Date | 2026-10-16 |
| Spike | S4, [docs/plans/M1.md](../plans/M1.md) §6 |
| Versions | Next 16.4.0 (Turbopack), React 19.3.0, Payload 3.90.2, Medusa 2.21.2 and `@medusajs/js-sdk` 2.21.2, Node 22.22.0, Postgres 17.11 (compose), Chromium 1248 through Playwright 1.64.0. One self-hosted `next start` process with Next's default caches. Measured on `f487874` (`main` after the M1 plan); the deciding cases were repeated on `463f1b5` (`main` after T24, with T18 to T25's layouts, fonts and DS routes) with the same results (below) |
| Prototype | commit `bbb4045` on `claude/affectionate-bohr-w4o42f` (D13: the spike code does not merge; `0df4adf` removes it from the tree). PRs merge with a merge commit (plan G2), so `bbb4045` stays in `main`'s history. Reproduce: SETUP.md, "Backend outage (S4)", row "Reproduce" |

## Context

SPEC §8.1 lists the home, PDP, PLP, CMS pages and posts as indexable and "cached". T12 built the M0 wiring page with its Medusa data in a streamed part (`Suspense` and `connection()`), and found that a backend outage then answers **HTTP 200** with the error state: Next sends the shell and its status before the part streams in, and Next 16.4's `loading` docs say a streamed response starts with 200. A page that blocks instead (no `Suspense`, `connection()`, `instant = false`) was worse: still 200, with Next's bare error page. W2's second run saw the same 200 on the first request after `pnpm dev`, while Medusa was still starting. SPEC §12 also asks for `notFound()` before any `Suspense` boundary, because a 404 after the first byte is a soft 404 (status 200).

The owner chose D36 on 2026-10-14: the indexable pages read their catalog data **in the static shell** through `cached()` and call `notFound()` there; `Suspense` is for per-visitor parts and `/search`; and `/next/status` answers 503 when Medusa or Payload doesn't answer. S4 checks it before this ADR records it.

What Next 16.4.0's bundled docs say (checked in `apps/storefront/node_modules/next/dist/docs/`, 2026-10-16):

- `generate-static-params.md`: with Cache Components, `generateStaticParams` must return at least one param; an empty array is a build error. A placeholder param handled with `notFound()` is the documented way out.
- `incremental-static-regeneration-cache-components.md`: with Partial Prefetching (on here, SPEC §8.3), a URL whose params were not prerendered gets the route's App Shell at once and is upgraded in the background (new in 16.3).
- `ensureStatic.md` (new in 16.4.0): `export const ensureStatic = "navigation"` requires the complete route to be static. "When a request uses a value that was not prerendered at build time, Next.js waits for the static result to be generated before serving it." The build fails on uncached data, `connection()` and runtime data (`cookies()`, `headers()`) **even inside `Suspense`**, and on a `use cache` scope with `expire` under 5 minutes, `stale` under 30 s or `revalidate` 0. Client Components may read per-visitor data in the browser.
- `cacheLife.md`: after `revalidate` a request gets the cached page and starts a regeneration in the background; after `expire` "with no traffic, the server regenerates content synchronously on the next request".

## Options

1. **A:** the data in a streamed part, as the wiring page does today (the fallback).
2. **B, chosen:** the data in the shell through `cached()`, `notFound()` before any `Suspense`, `generateStaticParams` from Medusa with a build stand-in, and `ensureStatic = "navigation"`.
3. **B2:** B without `ensureStatic`, to see whether the export is needed.
4. **B3 and B4:** B plus a per-visitor part (a cart cookie) in `Suspense`, read on the server with `cookies()` (B3) or in the browser by a Client Component (B4), to see how D36's "Suspense for the per-visitor parts" fits B.
5. **C:** `/next/status`, a route handler that answers 200 or 503, first with Medusa's `/health`, then with a Store API read.

## Tests and results

One build of a throwaway product page per variant under `(storefront)/[market]/spike-product/`, against the stack that `pnpm bootstrap` sets up, with the demo catalog's 8 products. B's `generateStaticParams` returned the first 2 handles (`demo-classic-tee`, `demo-heritage-hoodie`), so the other 6 were real products that the build never rendered. The product read had `cacheLife({ stale: 30, revalidate: 60, expire: 300 })`, the smallest that `ensureStatic` accepts, so that revalidate and expire could be passed in minutes; the market map's entry made the route's revalidate 30 s. Medusa ran as `medusa develop` and was stopped and started by its process group; the storefront was one `next start` (the same PID from O1 to O5). Every response was fetched with `curl` (status, time, body, `x-nextjs-cache`), and the ones that depend on hydration were opened in Chromium. URLs are public: `/spike-product/…` is the Greek market (`el-cy`), `/us/spike-product/…` the US one.

### The plan's tests

| # | Test | B | Passes? |
|---|---|---|---|
| O1 | A prerendered handle, Medusa up | 200 with the product, `x-nextjs-cache: STALE` (the build was 53 s earlier), `Cache-Control: s-maxage=30, stale-while-revalidate=270` | **Pass** |
| O2 | O1's URL with Medusa stopped, before and after `revalidate` | Stopped at 15:34:44. At once: `/us/…/b/demo-tote-bag` (rendered 12 s before) 200 with the product; `/…/b/demo-classic-tee` 200 STALE with its last good data. At 15:35:32 (48 s later, past both `revalidate`s): 200 with the same `fetched-at`, twice, and the hoodie 200 with the build's data. Chromium: the product, no error state, an empty console. The log has one line per failed background attempt: `Error revalidating the page in the background Error [MedusaRequestError]: Medusa at http://localhost:9000 did not answer (ECONNREFUSED: fetch failed); is the backend running (pnpm dev) and MEDUSA_BACKEND_URL right?` (logged as an error, not a warning) | **Pass** |
| O3 | A handle never rendered, Medusa stopped | `/…/b/demo-everyday-joggers`: **500** in 0.30 s, and 500 again in 0.05 s (nothing cached). The body (9.7 KB) is Next's bare shell, `<html id="__next_error__">` with no visible content; Chromium then renders the market's `error.tsx` in Greek (`Το backend του Medusa δεν είναι προσβάσιμο.`), with React's `Minified React error #441` in the console. The log has the `MedusaRequestError` and its digest | **Pass** |
| O4 | An unknown handle, Medusa up | `/…/b/no-such-product`: **404** in 0.085 s (`MISS`), 404 in 0.006 s (`HIT`), `<meta name="robots" content="noindex">`. The body is the same bare shell; Chromium renders the market's not-found page (`Η σελίδα δεν βρέθηκε`, `lang="el-CY"`). A `not-found.tsx` in B's own segment changed nothing: the same shell, its heading after hydration | **Pass**, with the body as a limitation (Decision, reading 6) |
| O5 | O3's URL after Medusa is back | Medusa back at 15:40:55 (7 s to `/health`): 200 with the product read at 15:40:55, then `HIT`; the same server process | **Pass** |
| O6 | `pnpm build` in CI's state | Both `.env` files moved out, the containers stopped, `pnpm build --force`: exit 0, 36.6 s, `Tasks: 2 successful`, `Cached: 0 cached`. The market map fell back to its fixtures (D10) and B logged `no MEDUSA_BACKEND_URL while building: prerendering the stand-in only` once per market. **It prerenders one page per market, `○ /<market>/spike-product/b/__build-stand-in`, stored as a 404** (its `.meta` has `"status": 404`), and no product | **Pass** |
| O7 | A build with `MEDUSA_BACKEND_URL` set and Medusa down | `next build` exit 1 in 7.1 s: `⨯ Error [MedusaRequestError]: Medusa at http://localhost:9000 did not answer (ECONNREFUSED: fetch failed); …` at the `generateStaticParams` read, then `Error: Failed to collect page data for /[market]/spike-product/b/[handle]` | **Pass** |
| O8 | `/next/status` (C) | See the next table | **Pass** with the Store API read; `/health` misses an outage of Medusa's database |
| O9 | The build output | `○ /el-cy/spike-product/b/demo-classic-tee  30s  5m` (and the hoodie, in every market); the route's own shell `◐ /[market]/spike-product/b/[handle]`; no `ƒ` | **Pass** |
| O10 | A, Medusa stopped (T12's result) | `/…/a/demo-canvas-cap`: 200 in 0.06 s, `$RX` (React's client-render fallback) in the body; Chromium shows the error state and logs React #441 | 200 and the error state, as T12 found |

**PASS** as the plan defines it: O1 to O7 and O9 pass for B, and O8 for C.

**Repeated on `main` after T24 (`463f1b5`).** The prototype applied cleanly (`git cherry-pick -n bbb4045` on this branch after `main` was merged in), `tsc` passed, and the build gave the same O9 output. Then: O1 200 (`HIT`), O4 404 with the bare shell and the not-found heading after hydration, an unlisted handle 200 (`MISS`), C 200; Medusa stopped: O2 200 with the last good data (twice), O3 500 twice, B2's O3 200, O10 200 with `$RX`, C 503; Medusa back: O5 200, C 200. B3 failed the build with the same message.

### `/next/status` (O8)

Each check has 2 s, and the two run side by side; the body is `{"status":"ok"|"unavailable","checks":{"medusa":"ok"|"down","payload":"ok"|"down"}}` with `Cache-Control: no-store`, and the reason goes to the server log only (`[status] medusa down: no answer after 2 s`, `fetch failed`, `payload down: Failed query: select count(*) from "pages"`). The Payload check is `payload.count({ collection: "pages" })`.

| Case | Medusa checked with `GET /health` | Medusa checked with `GET /store/regions?limit=1&fields=id` and the publishable key |
|---|---|---|
| Everything up | 200 in 0.06 s | 200 in 0.48 s (the first request after `next start`), then 0.01 to 0.03 s |
| Medusa stopped | 503 in 0.025 s | 503 in 0.014 s |
| Medusa hanging (a port that accepts and never answers) | 503 in 2.007 s, three times | 503 in 2.008 s, twice |
| Payload's database refusing connections (`ALLOW_CONNECTIONS false` on `payload` only) | 503 in 0.015 s, three times; 200 once it accepts them again, no restart | 503 in 0.025 s; 200 after |
| **Medusa's database refusing connections** (`medusa` only) | not run; `/health` itself answered **200** | **503 in 2.01 s**, twice, while `/health` answered 200; 200 after, no restart |
| The whole Postgres stopped | 503, but only through Payload's check: Medusa's `/health` answered 200 while `/store/regions` gave no answer in 15 s | not run |

### More checks

| Check | Result |
|---|---|
| **B2** (no `ensureStatic`), O3 | `/…/b2/demo-linen-shorts`: **200** twice (the bare shell, no content), then **500** on the third request. Soft at first |
| **B2**, O4 | `/…/b2/no-such-product`: **200** with the bare shell on the first request, 404 later. A soft 404 at first. B2's build also makes a per-market fallback shell (`◐ /el-cy/spike-product/b2/[handle]`) that B's doesn't |
| **A**, O4 | 200 with the not-found page streamed in: the soft 404 SPEC §12 warns about. Its streamed `<meta name="robots" content="noindex">` reaches the page (in the body and in Chromium); A's error state (O10) has none |
| **After `expire`** (B, Medusa still down) | At 15:40:19: `/us/…/b/demo-tote-bag`, not requested for 5 min 34 s, answered **500** once, then 200 (`HIT`) with its 15:34:32 data on every later request; `/us/…/b/demo-classic-tee`, not requested for 6 min 45 s, the same (500, then 200 three times). The Greek tee and the hoodie, last requested 4 min 47 s before, answered 200 STALE. So a URL left without traffic for longer than `expire` gives its first visitor a 5xx during an outage |
| An unlisted handle, Medusa up | B: 200 in 0.13 s (`MISS`: the request waits for the render), then 200 in 0.006 s (`HIT`) |
| A product read seconds before, then Medusa stopped | A and B both 200 with the product (`/us/…/demo-ceramic-mug`). A with a product read 82 s before (past its 60 s `revalidate`) showed the error state (O10's second URL): a request-time render did not serve the stale entry |
| **B3**: `cookies()` in `Suspense` under `ensureStatic` | **`next build` fails:** `Route "/[market]/spike-product/b3/[handle]": Next.js encountered uncached or runtime data on a route that must be fully static.` (the fixes it offers: cache it, remove it, or "[client] Read the data on the client") |
| **B4**: a Client Component reads the cart cookie in the browser, in `Suspense` | Builds; `○` like B; 200, 404 and the blocking first visit as B. In Chromium it shows `cart cookie: yes` with the cookie and `no` without |
| Payload's database refusing connections, B | `/…/b/demo-classic-tee` 200 (the page is served from the cache) |
| Other 404s in the same build | `/el-cy` (the internal key) and `/nope/nope` (no route) answer 404 with the full `global-not-found` HTML, `lang="en"`. Only a `notFound()` under `[market]` gives the bare shell |

**What shows the tests can fail.** The variants are the controls: B2 gives 200 where B gives 404 and 500 (O3, O4), A gives 200 (O10), `/health` gives 200 where the Store API read gives 503, O7 is O6 with the backend URL set, and the expiry check gives a 500 that O2 does not. No mutation of B itself was run.

**Not tested.** Vercel (SPEC §8.1's target): its ISR cache, how it treats `expire` and a failed regeneration, several instances, and its CDN's use of `s-maxage=30, stale-while-revalidate=270`. `revalidateTag` during an outage (does a webhook's `{ expire: 0 }` turn a stale page into a 500?). A home page, a PLP, a CMS page or a post: only a PDP was built, and the CMS pages read Payload, not Medusa. `generateStaticParams` with the whole catalog (build time and the number of pages). A Medusa that answers slowly but inside the SDK's 10 s. `next dev`. `use cache: private` under `ensureStatic`. Payload's database down while a page is regenerated (the market map is read through Payload).

## Decision

**Accepted: D36 as the owner chose it.** The indexable catalog pages (home, PDP, PLP, CMS page, post) read their data in the static shell through `cached()` and call `notFound()` there, before any `Suspense`; `/next/status` answers 503 when Medusa or Payload does not answer. A backend outage then serves the last good page (O2), a page that was never rendered answers 500 (O3), a missing page is a real 404 (O4), everything recovers without a restart (O5), and a build without a backend still passes (O6).

**The readings S4 adds.** They follow from the results, and each stands until the owner changes it:

1. **Catalog pages export `ensureStatic = "navigation"`.** Without it (B2) a page that was not prerendered answers 200 at first, for a missing product and during an outage alike, because Partial Prefetching serves the App Shell while the real render runs in the background. The export also makes the build refuse anything that would put request-time work in the page.
2. **Per-visitor parts on those pages are Client Components that read in the browser, inside `Suspense`.** `ensureStatic = "navigation"` fails the build on `cookies()` even inside `Suspense` (B3), and it covers the layouts above the page (`ensureStatic.md`, "Combining levels"; not built here), so the header's cart count in `[market]`'s layout is one of them. B4 shows the pattern works. This is how D36's "`Suspense` is for the per-visitor parts" is read. **The alternative**, if server-rendered islands matter more: drop `ensureStatic` (B2) and accept a soft 200 on the first requests for a page that was never rendered.
3. **The catalog's `expire` is set by the longest outage the shop should ride out, not by freshness.** A URL with no traffic for longer than `expire` gives its first visitor a 500 during an outage (then the old page again). Freshness comes from tags (webhooks, SPEC §8.3) and `revalidate`. `ensureStatic` refuses `expire` under 5 minutes, `stale` under 30 s and `revalidate` 0.
4. **`generateStaticParams` reads Medusa, with D10's stand-in.** While `next build` runs with no `MEDUSA_BACKEND_URL`, it returns one placeholder handle that the page turns into a 404 before it asks Medusa anything (O6); with the URL set, an unreachable Medusa fails the build and names it (O7). So a deployment builds with its backend up, and **CI's `e2e-smoke` has to start Medusa before `pnpm build`** once the first catalog page exists (today it starts Medusa after the build).
5. **`/next/status` reads the Store API, not `/health`.** Medusa 2.21's `/health` answers 200 while its database is down. The check is a cheap Store API request with the publishable key, and Payload's is a real query; 2 s each, side by side, `no-store`, and a body with no internals.
6. **The HTML of a B page's 404 and 500 is Next's bare error shell.** The status and `noindex` are in the response, and the not-found page or the error state renders after hydration, so a visitor without JavaScript sees an empty page. Accepted as a limitation: on a minor bump of `next`, check `curl` on a missing product, and file or link the upstream issue when someone with access can (M0 plan, F3).

### The fallback (not taken)

A for every page, as the wiring page is today, plus C. A missing product would then be a soft 404 (200) and an outage a 200 with the error state; the not-found page's `noindex` does reach the page (above), the error state has none unless `error.tsx` adds it.

## Consequences

- **M2:** the cart count and any other per-visitor molecule meant for the header or a catalog page is a Client Component that reads in the browser (reading 2).
- **M3** builds the home, PDP and PLP to this ADR, and `/next/status` with the first catalog page (readings 1 to 5): `ensureStatic = "navigation"`, the stand-in in `generateStaticParams` (with a unit test of the build rule, as `get-market-map.test.ts` has for D10's), a `cacheLife` with a long `expire` and tags, and `e2e-smoke` starting Medusa before `pnpm build`. The checks that carry this decision land with that code: a Playwright test that stops Medusa by PID and expects O2's 200, O3's 5xx and O4's 404, and C's 503.
- **M4** builds CMS pages and posts the same way; their data is Payload's, so the stand-in rule is D10's (no `PAYLOAD_DATABASE_URL` while building).
- **M7:** the uptime monitors point at `/next/status`. The deployment check on a Vercel preview repeats O2, O3 and the expiry check, because Vercel's cache is not the one measured here.
- **Harder:** a deployment's build needs Medusa up (and Payload's database, already, D10). Per-visitor parts cannot be server-rendered into a catalog page. `generateStaticParams` decides the build's size: M3 chooses how many products to prerender (the rest render on their first visit, which waits for Medusa).
- **Still open:** the bare-shell body (reading 6), and the untested items above.

## Spec changes

For SPEC v0.7 (M1's T26):

- **§8.1, the streamed-part paragraph:** "Decide with the first real catalog page (M1)" becomes ADR 0004's decision: the indexable pages read their data in the static shell with `ensureStatic = "navigation"`; an outage serves the last good page, a page never rendered answers 500, a missing one 404, and `/next/status` gives monitors the state.
- **§8.1, the route table:** home, CMS page, PDP, PLP and post: "static shell (`ensureStatic = "navigation"`), `cached()` with tags; per-visitor parts read in the browser". PDP: "cart controls are Client Components" instead of "cart controls in Suspense". A new row: `/next/status` | uptime check: 200, or 503 when Medusa's Store API or Payload's database does not answer within 2 s | n/a | dynamic, `no-store`.
- **§8.3, "Cart, customer and checkout":** on a catalog page and in the layouts above it, per-visitor parts are Client Components that read in the browser (the header cart count included); `Suspense` holes and `'use cache: private'` stay for the dynamic pages (cart, checkout, account). The catalog's `cacheLife` has a long `expire` (ADR 0004, reading 3).
- **§12, "Status codes":** add `ensureStatic = "navigation"` to "`notFound()` before any Suspense boundary", and that a catalog page answers 5xx, not 200, when it cannot be rendered.
- **§14, CI:** `e2e-smoke` starts Medusa before `pnpm build` from M3 on, and has the outage test.
- **§17.1, M3's row:** the catalog pages to ADR 0004 and `/next/status` (already in M1 plan §8 item 14).
