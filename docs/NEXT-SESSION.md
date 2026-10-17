# T27 to T33 are done; T34 is next

**The M2 plan** ([plans/M2.md](plans/M2.md), molecules, organisms and the registry, SPEC §17.1) was merged in [PR 48](https://github.com/stephanos221/shopblok-starter/pull/48). Its decisions D40 to D55 are defaults that stand, because you said on 2026-10-16 that M2's tasks may start once the plan is written; you can change any of them at any time, and the task that builds it then follows the new text. Three are worth a look: **D46** (M2 builds Header 6, Footer 5 and ProductCard 10, so the DS page ends M2 with 114 entries outside Foundations), **D51** (684 pixel baselines committed in git, an expected 40 to 60 MB; T40 stops and asks you above 60 MB) and **D53** (the CI gate). **G6, optional, about two minutes:** look at this month's Actions minutes under Settings → Billing and plans → Usage (the plan's §0, item 2, says why).

**T27 is done** (2026-10-17, SETUP.md "CI for M2 (T27)"). A pull request now starts with a `gate` job that reads its changed files: a docs-only PR runs `check` and `backend-integration` only, a PR that changes only the design system's own files (molecules, organisms, the registry, the DS pages) skips `e2e-smoke`, and `windows-smoke` still runs only for a dependency file. Pushes to `main`, the weekly run and a run by hand still run `e2e-smoke` and `design-system`, and `windows-smoke` still runs weekly and by hand. The DS pages' console check in `next dev` moved into the `design-system` job, and its wait for the network to go quiet is bounded, so a hang like the one on PR 48's CI now fails in 30 s and names the request.

**T28 is done** (2026-10-17, SETUP.md "Root files (T28)"). A root path that looks like a file and that nothing serves (`/robots.txt`, `/apple-touch-icon.png`, `/wp-login.php`) now answers a short plain-text 404 instead of the storefront's 404 page, and `next dev` no longer logs an error for each. `/favicon.ico` is still the icon, and M7's `robots.ts` and `sitemap.ts` will be served before the rule.

**T29 is done** (2026-10-17, SETUP.md "The registry (T29)"). The design system's 40 entries are now a list of data in `packages/registry`, which the DS page, its CI checks and, from M4, Payload's pickers read. What the page says about each entry stays in the storefront, and a test fails when an entry and its text do not match. Each entry also has a bare preview page, which T40 will photograph for the thumbnails, and a build now fails if a DS page ever reads the request. The page looks exactly as before.

**T30 is done** (2026-10-17, SETUP.md "View models, copy and fixtures (T30)"). The shapes of the data M2's components take (a product card, a cart, an address, an order, the navigation and so on) are now written down once, in `packages/registry`, and checked: a price is a number in its currency, a sale price is higher than the price, a saved card can never hold a card number. The texts are now messages that know plurals ("Απομένει μόνο 1", "Απομένουν μόνο 3") in a file per language, and a test fails when a language lacks a text or changes one of its blanks. A set of sample shop data in the four languages (12 products, a cart, addresses in Cyprus, the US, Germany and Switzerland, orders, reviews, menus) is ready for the components. The Greek, German and French samples were written by the session; they are for you or a native speaker to read at W4. The page looks exactly as before.

**T31 is done** (2026-10-17, SETUP.md "Primitives (T31)"). The building blocks under the molecules are in `packages/ui`: dialogs, side sheets, the bottom sheet, menus, the mega menu, popovers, toasts, tabs, accordions, a carousel, a slider, pagination, breadcrumbs, a table, a stepper and a timeline (22 in all), on the atoms' rules: 44 px targets, no English inside them (every text is passed in from the language's file), and sides that follow the reading direction. Every page now has one wrapper that gives it tooltips, notifications (their region is named in the page's language: "Ειδοποιήσεις" on `/`) and the reading direction. The design-system page can draw a sheet or a menu open inside a box, and a test checks that it stays inside. Two choices are **yours to change**: a pressed toggle and the current page number are filled with the primary colour (the kit's grey is 1.1:1 against the page, too faint to see), and a highlighted destructive menu item is solid red, as the destructive button is. T31 also found that T21's Checkbox and Radio had a 42 px touch area instead of 44; it is 44 now. The page looks exactly as before.

**T32 is done** (2026-10-17, SETUP.md "Product molecules (T32)"). The product card is in `packages/ui` in its ten looks (standard, with colours, with an add-to-cart button, text over the picture, minimal, side by side, compact, editorial, framed, and a second picture on hover), with the price block, the size and colour picker, the rating summary, a review and a captioned picture. Each card is one link, so a screen reader hears one name per product, and anything else on it (the add-to-cart button) sits outside that link. The design-system page has 15 new entries, and every one passes in English and Greek at three widths. The plan expected axe to catch a button hidden inside a card's link; it does not, so the DS checks now look for that themselves. A few choices are **yours to change**: a card shows at most two badges, its colours are for show (choosing one happens on the product page), it does not show "only 3 left", and the picker keeps a sold-out colour or size reachable and says it is sold out. The Greek, German and French texts are for W4's read.

**T33 is done** (2026-10-17, SETUP.md "Discovery and site-wide molecules (T33)"). The pieces a shop's listings and every page need are in `packages/ui`: the search field, breadcrumbs, page numbers, the sort menu, the filters (checkboxes with counts, colours, a price range with a slider, on/off switches), the chips of the chosen filters with "Clear all", the no-results message, the country and language switcher, the newsletter form, a FAQ item, notifications, a discount code with a copy button, and a countdown. Search, sort, filters and page numbers work without JavaScript and keep their choices in the address, so search engines can follow every page. The country switcher is a popover on a wide screen and a bottom sheet on a phone, and its flags are drawn on the server, so no flag's drawing reaches the browser (a test reads the built files). CI now opens the switcher and a notification from the keyboard at phone and desktop widths, and checks that focus goes in, stays in and comes back when it closes. The design-system page has 13 new entries, and every one passes in English and Greek at three widths. A few choices are **yours to change**: a filter option with no products left is greyed out; an error notification stays until it is closed, while the others leave after 5 seconds (10 with a button); and every notification is announced politely, an error too. The Greek, German and French texts are for W4's read.

**Next:** T34, the cart, checkout and account molecules (its prompt is below). Nothing waits on your PC until W4.

Every M2 task runs the same way (D55): a cloud session in the `shopblok-starter` environment, on `main`; a PR; a code review of it in a separate thread, with its findings in `reviews/pr-N-code-review.md` in the project's files; the session fixes them and merges with a merge commit once CI is green.

## T34 · Cart, checkout and account molecules (in a cloud session)

Start a cloud session in the `shopblok-starter` environment, on `main`, and paste:

> Run task T34 of docs/plans/M2.md: CartLineItem, PromoCodeField, FreeShippingProgress, AddressCard, AddressForm, ShippingOptionCard, PaymentMethodCard, SavedPaymentMethodCard, OrderSummaryRow, Stepper, ShippingEstimator and VerificationNotice in `packages/ui/src/molecules/`. Start as docs/CLOUD.md, "What every cloud session does first", steps 1 and 2 say; it needs no stack. Read docs/plans/M2.md (§1 D41 to D48, §5's shared rule and T34), SPEC §8.4 and §9.3, and SETUP.md's "View models, copy and fixtures (T30)", "Primitives (T31)", "Product molecules (T32)" and "Discovery and site-wide molecules (T33)" first. Work on a new branch from `main`. Make D48's choice first (its step 1) and record the table. Follow T34's steps and its Verify list, including each mutation. Record everything in docs/SETUP.md under "Cart, checkout and account molecules (T34)", update the plan's status line and NEXT-SESSION.md, then open a PR. It gets a code review in a separate thread; fix its findings, and merge with a merge commit once CI is green (G2).

## M1 (closed 2026-10-17)

**W3 passed** (2026-10-17, SETUP.md ["Windows check and design review (W3)"](SETUP.md#windows-check-and-design-review-w3), [PR 47](https://github.com/stephanos221/shopblok-starter/pull/47), merged), so **M1 is closed**. On the PC: Inter on `/` and `/us` with the Greek subset only on `/`, the Payload admin unchanged, all 40 DS pages in four locales at three widths clean (644 loads: no overflow, no console message, no failed request), `pnpm tokens` with no diff, `pnpm typecheck && pnpm lint && pnpm test && pnpm build` in CI's state (`test` passed on its second run after two cold-start time-outs), `/design-system/en` 200 with the flag and 404 without, and one Ctrl+C stopping `pnpm dev` (16 processes to 0). Your design review found nothing to change; add a row to SETUP.md's review table if you see something later.

**The cloud environment is fixed.** Its setup script ran again on 2026-10-16 at 10:03 UTC (`/var/log/shopblok-setup.log`), so a session finds pnpm 12.10.1, Chromium 1248 in `/opt/ms-playwright`, `/opt/dtc-starter` and `/opt/payload-templates`. CLOUD.md's step 3 still covers a compose image that is missing.

**T26 is done** (2026-10-16): [SPEC.md](SPEC.md) is v0.7, with a "Changes in v0.7" table that applies the plan's §1 and every item of its §8, and ADR 0004's "Spec changes" (§8.1, §8.3, §12, §14, §17.1). SPEC §9.3 keeps its 32 atoms (the plan's 33 was a miscount). SETUP.md's quickstart now has the design-system page (`/design-system/{locale}`, the `DESIGN_SYSTEM_ENABLED` build flag), `pnpm tokens` and how to export from Figma again; the README mentions the page and carries the kit's CC BY 4.0 credit.

**S4 passed** (2026-10-16, [PR 45](https://github.com/stephanos221/shopblok-starter/pull/45), merged, SETUP.md "Backend outage (S4)"): [ADR 0004](adr/0004-catalog-data-in-the-shell.md) is *Accepted* with D36 as you chose it. A product page that reads Medusa in its static shell kept serving the last good page while Medusa was down, answered 500 for a page it had never rendered and a real 404 for a missing product, recovered without a restart, and built in CI's state with a stand-in; `/next/status` answered 503 within 2.01 s in every outage. The deciding cases were repeated on `main` after T24, with the same results. The prototype commit `bbb4045` is in `main`'s history. S4 adds six readings that stand unless you change them (below, item 1), and one of them has a real alternative.

**T24 added the `design-system` CI job** (2026-10-16, SETUP.md "DS checks (T24)"): every atom at 375, 768 and 1440 px in `en` and `el` (192 cells) is checked with axe, for overflow, for 44 px targets and for console messages, with a screenshot of each in the `design-system-report` artifact. **T23 added the other 15 atoms** (2026-10-16, SETUP.md "Atoms (T23)"), so all 32 of SPEC §9.3 (the plan said 33) are in `packages/ui/src/atoms/` with tests and DS entries (`atoms-commerce.tsx`); Price formats through `formatMoney`, PaymentIcon uses simple-icons and Flag country-flag-icons as a server component. Two choices are **yours to change**: unavailable swatches and size pills stay focusable, and the quantity stepper keeps Base UI's keyboard model (Tab reaches the input, the arrows step it). **T21 added the 17 shadcn atoms** (2026-10-16, SETUP.md "shadcn and ReUI (T21)"): `packages/ui/src/atoms/` on the tokens, each with component tests (Vitest, happy-dom, Testing Library) and a DS entry in `apps/storefront/src/design-system/atoms.tsx`; a scan (`src/atoms/class-rules.test.ts`) fails on a physical class, a colour literal, a `dark:` variant or `ring-ring/<alpha>` in any atom, T23's included. shadcn's registry now imports its own `cn` package (`src/lib/utils.ts` re-exports it); `clsx` and `tailwind-merge` are not used. Checkbox, Radio and Switch keep the kit's size with a `::after` hit area, and their `Label` (`min-h-11`) is the 44 px target. `/design-system/{locale}/atoms/select` is in the dev-console list. **T25** (PR 41) and **T22** (PR 40) are merged: the dev-console step ends `e2e-smoke`, `/favicon.ico` is a placeholder (**yours to replace**), and the DS shell has the Foundations pages and the `DESIGN_SYSTEM_ENABLED` gate. **T19 built the tokens** (SETUP.md "Tokens (T19)"); **the field edge is yours to change** (below). Earlier: T18 exported the Figma kit ([SETUP.md](SETUP.md#figma-export-t18)), T20 wired Tailwind and Inter ([SETUP.md](SETUP.md#styles-and-fonts-t20)), M0 is closed ([PR 29](https://github.com/stephanos221/shopblok-starter/pull/29)), and the M1 plan is [plans/M1.md](plans/M1.md) ([PR 30](https://github.com/stephanos221/shopblok-starter/pull/30)).

## W3 · Windows check and design review (passed 2026-10-17; kept for a rerun)

**Passed** (SETUP.md, "Windows check and design review (W3)"). The prompt below is kept for a later milestone's Windows check, as it was run except for two hints added to its steps 1 and 2 (what the run found). W3 has two halves (the plan's §4a). A session runs and records the checks (the plan's W3 steps 1, 3 and 4, and the Windows parts of the plan's §7: `pnpm tokens` leaves no diff, the DS page works in `next dev` and in a flagged build and is a 404 without the flag). **The design review (the plan's W3 step 2) is yours:** you go through Foundations and every atom with the kit open in Figma beside it, and write down each difference you care about. Each difference then goes to a cloud fix task or is recorded as accepted.

Open the desktop app's Code tab on `E:\shopblok-starter`, with the Figma connector signed in if you want the session to read the kit with you, stop any other checkout's stack (`docker compose ls`), and paste:

> Run checkpoint W3 of docs/plans/M1.md (§4a, "W3 · Windows check and design review", and §7 on Windows). Read docs/plans/M1.md (§4a, §7), SETUP.md's "Windows notes", "The design-system page, tokens and the Figma export (M1)" and "Windows exit check (W2), second run", and this file's "Running W2 again" first. In `E:\shopblok-starter`: `git switch main`, `git pull`, `pnpm install --frozen-lockfile`, `docker compose up -d --wait`, `pnpm bootstrap`, `pnpm dev`, with `$env:SWC_NATIVE_BINDING_CACHE` set as SETUP.md's "Windows notes" say. Then check and record, with the output:
> 1. (Steps 1 and 2 use Playwright 1.64.0, which needs Chromium build 1248: run `pnpm exec playwright install chromium` in `apps/storefront` once.) `localhost:8000/` and `/us` compute `Inter` as the body's font, an Inter `FontFace` is loaded, `/` fetches the Greek subset file and `/us` does not, and the Payload admin at `/admin` looks as it did. Read the `@font-face` rules from `document.styleSheets`: `e2e/styles-fonts.spec.ts`'s Greek-subset test reads the `<link>` stylesheets of `next start` and fails under `pnpm dev`.
> 2. `localhost:8000/design-system/el`, every Foundations page and every atom page, in `en`, `de`, `fr` and `el` at 375, 768 and 1440 px: no horizontal overflow, no console message, no failed request. Do not judge the look against Figma; list anything odd for me.
> 3. `pnpm tokens` twice: `git status` shows no change (line endings included).
> 4. Wait until I say my design review (the plan's W3 step 2) is done, because this step stops the dev server it uses. Then stop `pnpm dev` (`^C`, and check that nothing is left on :8000), stop the stack (`docker compose down`), and move the two `.env` files out (CI's state). Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Then `$env:DESIGN_SYSTEM_ENABLED = 'true'; pnpm --filter @shopblok/storefront build`, `pnpm --filter @shopblok/storefront start`: `/design-system/en` answers 200. Stop `start`, run `Remove-Item Env:DESIGN_SYSTEM_ENABLED` (the variable stays set for the rest of the PowerShell session otherwise), check with `$env:DESIGN_SYSTEM_ENABLED` that it prints nothing, build again, start again: `/design-system/en` answers 404. Stop `start`.
> 5. Move the two `.env` files back, run `docker compose up -d --wait`, then `pnpm dev`. One `^C` in the terminal that runs `pnpm dev` stops it and leaves no process of the checkout behind (W2's check, now with M1's dependencies).
> Write the results into docs/SETUP.md under "Windows check and design review (W3)", with a table for my review items (what I saw, "fix task" or "accepted") that I fill in, update the plan's status line, §7 and this file, then open a PR and don't merge it.

**Your part, while it runs (the plan's W3 step 2).** Open `localhost:8000/design-system/el` in your browser and go through Foundations and every atom at the three widths in the four locales, with the kit open in Figma beside it ("shadcn/ui – Design System by ReUI", file `1PUSIlNviAwiZT0praTxES`). The kit's copy draws only payment icons and flags, so compare colours, type, radius and the variables with Foundations, and the atoms against the shadcn look you expect. Things already decided that you may want to change: the field edge `#949494`, the ring at full strength, the solid `destructive`, `success`, `warning` and `info` colours, and the 44 px controls (T19's and T21's choices, listed under "Still open from M0", item 1, and in SETUP.md's "Tokens (T19)" and "shadcn and ReUI (T21)"). Pass means steps 3 and 4 of the plan's W3 pass and your review list has no open item (the plan's W3 "Verify").

## Still open from M0 (yours)

G3 is closed ([SETUP.md](SETUP.md#ci-t16), "CI (T16)", item 5, "Outcome"): Renovate is installed and its pin PR is merged, and Dependabot alerts are on. Secret scanning, push protection and branch protection are not available for a private repo on a personal Free account, so `main` stays unprotected. Wait for green CI before merging, because `gh pr merge --auto` merges at once.

1. **Say so if you disagree with a default.** Each one stays unless you say.
   - **ADR 0004's readings** (S4, "Decision"):
     - catalog pages export `ensureStatic = "navigation"`; without it the first answers for a page never rendered are 200 (B2);
     - **per-visitor parts on catalog pages, the header's cart count included, are Client Components that read in the browser**, because `cookies()` fails the build under that export even inside `Suspense` (B3). **The alternative:** drop the export and keep server-rendered islands, accepting a soft 200 on the first requests for a page never rendered;
     - the catalog's `expire` is long, because a URL idle for longer than `expire` gives its first visitor a 500 during an outage;
     - from M3, `e2e-smoke` starts Medusa before `pnpm build`, and a build with `MEDUSA_BACKEND_URL` set needs Medusa up (CI's `check` build uses a stand-in);
     - `/next/status` reads Medusa's Store API, because `/health` answers 200 while Medusa's database is down;
     - the 404 and 500 bodies of those pages are Next's bare error shell, filled in after hydration (a limitation; check on a `next` bump).
   - **T19's choices** (SETUP.md, "Tokens (T19)"):
     - **the field edge:** `input` is `#949494` (3.03:1, the lightest grey that passes; the kit's `#e5e5e5` is 1.26:1). The alternatives are `#737373`, or no visible edge where a fill or a label identifies the field (WCAG 1.4.11). Edit `semantic.input` in `packages/ui/tokens/shopblok.tokens.json` and run `pnpm tokens`;
     - **the ring** is drawn at alpha 1 in the same `#949494` (at the kit's 50 % it would have to be `#2a2a2a`);
     - **`muted-foreground`** `#737373` becomes `#707070`, and `destructive-foreground` becomes white;
     - **`success`, `warning` and `info`** are solid surfaces with white text, in darker steps of the kit's own hues (Emerald-800, Yellow-700, Violet-600), because the kit's 500 steps fail under white;
     - **breakpoints:** Tailwind's five (the kit's) stay, and 375/768/1024/1440 are `--viewport-*` custom properties;
     - **`--shadow-sm`** follows the kit's effect style, which has one layer where Tailwind's has two;
     - the z-index, container and motion values are mine (one-line edits).
   - **ADRs 0002 and 0003 are *Accepted*** because your T17 prompt changed none of S2's readings R1 to R5 or S3's R1 to R6. The ones with a real alternative:
     - S2 R1: Meilisearch keeps one index per locale (option B). Option A, on both providers, would be 2.3 times smaller and needs a restart for a new language.
     - S3 R1: the filter's 2-second memo leaves another server process up to 2 s behind a save.
     - S3 R5: "locales only grow" is a comment and two tests, not a CI check on migrations.
   - **T17's own choices** (SETUP.md, "Step 4"):
     - the S1 checks use six route handlers under `/next/e2e` that answer 404 unless `E2E_TEST_ROUTES=true`;
     - the `pages` collection has a revalidation hook;
     - Playwright runs with one worker;
     - the backend's integration tests are a job of their own;
     - `payload-locales.spec.ts` stays in `e2e-smoke`.
   - **The W2 fixes' choices**, now confirmed on the PC:
     - `pnpm dev` is `node scripts/dev.ts`, one more `node` process in front of turbo on every OS, so that turbo starts each task through `pnpm.exe` rather than `pnpm.cmd`. The alternative is `"dev": "turbo run dev"`, pressing `^C` twice on Windows.
     - In `next dev`, the first read of the market map may take 60 s (10 s everywhere else). The alternative was the seeded fixtures for an unreachable map in development.
   - **Three S1 checks are not in CI**; their follow-ups are named in the M0 plan (§5, "Follow-ups from T17", F1 to F7):
     - the first-user form (M7);
     - the media drawer (the first M4 collection with an upload field);
     - the dev-mode console (needs an upstream issue).
2. **Carried over, unchanged.** Each has its default; the evidence is in SETUP.md and the ADRs.
   - The first request after a `next start` can wait 320 to 370 ms (`instrumentation.ts`, decided at M7).
   - A saved `markets` map reaches the proxy in 30 to about 65 s.
   - `/cy/` is two hops.
   - Other server processes lag a `markets` save by up to 2 s.
   - Bulk translation imports make one `translation.created` event per row.
   - `HTTPS_PROXY`, `NO_PROXY` and `NODE_EXTRA_CA_CERTS` are dropped under `pnpm dev` (add them at M6).
   - `--env-mode=loose` for `dev` only was considered and left out.
   - Payload's silent CLI exit is retried, and the upstream issue is yours to file (F4).
   - Orphan regions are reported by `doctor`, never deleted.
   - Catalog data in a streamed part gives HTTP 200 on a backend outage (SPEC §8.1). **Decided by ADR 0004** (S4 passed): the catalog pages read their data in the static shell, built that way in M3; the M0 wiring page keeps the streamed part until M3 replaces it.
   - Bootstrap keeps a plain-text dev password in a git-ignored file.
   - The prototypes stay in their commits, not on `spike/*` branches.
   - Medusa's one-time Claude Code question on the first `^C` has never been seen. It cannot appear on this PC, where the `medusa-dev` plugin is installed.

## Running W2 again (for a later milestone)

This is the Windows half of the plan's §7. The steps that passed on 2026-10-13 are below; repeat every item. The numbers to compare against are in [SETUP.md](SETUP.md#windows-exit-check-w2-second-run), "Windows exit check (W2), second run", and Linux's in [SETUP.md](SETUP.md#the-exit-criteria-plan-7-in-the-fresh-clone), "The exit criteria (plan §7) in the fresh clone".

1. **Prerequisites.**
   - Docker Desktop is running, and long paths are on: `(Get-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem).LongPathsEnabled` prints `1`.
   - Stop any other checkout's stack first: `docker compose ls` should list none of this project's.
   - **Remove the last run's clone:** run `docker compose down -v` in `E:\shopblok-starter-w2` (its containers and four volumes), then delete the folder yourself. The desktop app does not let a session remove a folder at a drive's root, and `cmd /c rmdir /s /q "\\?\E:\shopblok-starter-w2"` copes with the 309-character paths.
2. **Clone:** `git clone https://github.com/stephanos221/shopblok-starter E:\shopblok-starter-w2`. From the desktop app, set `$env:SWC_NATIVE_BINDING_CACHE` as SETUP.md's "Windows notes" say. A PowerShell window outside the app does not need it.
3. **In that folder, follow [SETUP.md's quickstart](SETUP.md#quickstart-no-keys-no-accounts) word for word:** `pnpm install --frozen-lockfile`, `docker compose up -d --wait`, `pnpm bootstrap`, `pnpm dev`.
4. **Check every item of §7 on Windows:**
   - **In the browser:**
     - `localhost:8000/` is in Greek with EUR prices. The very first request after `pnpm dev` starts takes 30 to 40 s in a fresh clone, and must answer 200, not 500.
     - `/us` and `/ch/fr` show their markets; `/cy` redirects to `/`; `/el-cy` returns 404.
     - The Medusa admin is at `localhost:9000/app`.
     - The Payload admin is at `localhost:8000/admin`, and its locale selector offers English, français, Deutsch and Ελληνικά.
   - `pnpm check:workspace` prints **8 packages** under "Payload versions".
   - A second `pnpm bootstrap` reports `0 done, 10 unchanged, 2 skipped`.
   - `pnpm run doctor` gives 12 checks ok and 1 warning (the email one); `pnpm run doctor --online` gives 15 ok and 1 warning.
   - `pnpm typecheck && pnpm lint && pnpm test && pnpm build` passes in CI's state: stop the stack and move the two `.env` files out first. **The test counts are 19 + 397 + 326 + 677 + 85** (i18n, scripts, ui, storefront, backend; as of T23. They were 18 + 397 + 422 + 85 at T19, before `packages/ui` had tests), with no `Errors` line.
   - **One `^C`** in the terminal that runs `pnpm dev` brings the prompt back and leaves no process of the checkout behind. `Get-CimInstance Win32_Process | Where-Object CommandLine -like '*shopblok-starter-w2*'` should list nothing except an editor's TypeScript servers, if one is open. Each task prints `Terminate batch job (Y/N)?` once on its way out; that is expected, and nothing waits for an answer.
   - `pnpm infra:down` then `pnpm infra:up` keeps both databases.
   - `pnpm infra:reset` followed by `pnpm bootstrap` brings them back. Then restart `pnpm dev`, because the new database has a new publishable key.
   - D17: add Brazil as "Opening a market" says, then run `pnpm infra:reset` and `pnpm bootstrap`, and check `/br`, the BRL search and `doctor --online`. Revert the edits.
5. **Write each result into SETUP.md** in a new section, and open a PR.

## Notes

- The plan's decisions are in [plans/M0.md](plans/M0.md) §1. Change a decision there first if a task shows it doesn't hold.
- To continue a cloud session on your PC, run `claude --teleport` in `E:\shopblok-starter` (see [CLOUD.md](CLOUD.md)).
- Every cloud session starts with Docker off, and the stack's containers and databases don't survive a session. A session that needs the stack starts Docker and runs `pnpm infra:up` (CLOUD.md, step 3), then `pnpm bootstrap` (step 4).
- The backend's integration tests and the Playwright suites leave nothing behind when they finish. A run that is killed leaves the runner's temporary databases (`medusa-<id>-integration-1` and `-template`) in the compose Postgres; `pnpm infra:reset` removes them. A session that runs `next start` or `next dev` on port 8000 must stop it by PID before it ends.
- A worker restart in the middle of a session stops the Docker daemon and the containers, but keeps the volumes and the files. Start `dockerd` as in CLOUD.md step 3 and run `pnpm infra:up` again.
- W2's clone `E:\shopblok-starter-w2` and its four volumes are kept after the second run, with the stack stopped. `docker compose down -v` there and deleting the folder remove them.
