import { checkRoutesInDev } from "./support/dev-console";

// T25 (ADR 0001, D37): the storefront's own routes in `next dev`, judged by the console rules of
// `payload-admin.spec.ts` (support/dev-console.ts says how). It runs against `next dev -p 8000`, not
// `next start`: the `dev-console` project exists only when E2E_DEV_CONSOLE=true
// (playwright.config.ts), so the default run never meets it. In CI it is the last step of
// `e2e-smoke`; locally: SETUP.md, "The storefront in next dev (T25)". The DS pages are
// `dev-console-ds.spec.ts`'s (T27), which the design-system job runs without the stack.
checkRoutesInDev([
  { path: "/", status: 200 },
  { path: "/us", status: 200 },
  { path: "/ch/fr", status: 200 },
  // W5: the catalog pages with a handle, whose first load reported Next's instant-navigation check.
  { path: "/us/store", status: 200 },
  { path: "/us/categories/apparel", status: 200 },
  { path: "/us/collections/summer-edit", status: 200 },
  { path: "/us/products/demo-classic-tee", status: 200 },
  // Not an open market: the proxy lets it through and the market layout answers its 404 page.
  { path: "/el-cy", status: 404 },
  { path: "/nope/nope", status: 404 },
  { path: "/next/markets", status: 200 },
  // Root files (T28, D54): the plain-text 404 of `/next/missing-file`, not `[market]`, which logged
  // `Could not validate` to the server log for each (`e2e-smoke` greps that log after this run).
  { path: "/robots.txt", status: 404 },
  { path: "/apple-touch-icon.png", status: 404 },
]);
