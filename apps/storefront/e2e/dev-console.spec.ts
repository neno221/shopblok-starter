import { expect, test } from "@playwright/test";
import { collectConsole, judgeConsole, type FailedRequest, type Message } from "./support/console";
import { excusedInDev, isOwnNotFound } from "./support/dev-console-excuses";

// T25 (ADR 0001, D37): the storefront's own routes in `next dev`, judged by the console rules of
// `payload-admin.spec.ts` (support/console.ts). ADR 0001 measured the Payload admin there and found
// it noisy; it never measured the storefront's pages. The admin stays out of this suite (ADR 0001's
// decision), and so does anything under /api.
//
// It runs against `next dev -p 8000`, not `next start`: the `dev-console` project exists only when
// E2E_DEV_CONSOLE=true (playwright.config.ts), so the default run never meets it. In CI it is the
// last step of `e2e-smoke`; locally: SETUP.md, "The storefront in next dev (T25)".
//
// Each route is opened in a page of its own, so a message belongs to the route that logged it, and
// the first visit to a route compiles it (the test timeout allows 90 s). A message is either ours
// and fixed, or Next's or React's dev-only validation and then excused by its exact text and route
// in support/dev-console-excuses.ts, with the upstream issue if one exists.

test.setTimeout(90_000);

// Foundations pages are DS entries that exist today; plan T25 step 1 asks for "one atom page in
// each of the four locales", and there are no atoms yet (T21 is not merged). T21 or T23 adds one
// atom page to this list (SETUP.md, "The storefront in next dev (T25)").
const designSystemLocales = ["en", "el", "de", "fr"] as const;

const routes: { path: string; status: number }[] = [
  { path: "/", status: 200 },
  { path: "/us", status: 200 },
  { path: "/ch/fr", status: 200 },
  // Not an open market: the proxy lets it through and the market layout answers its 404 page.
  { path: "/el-cy", status: 404 },
  { path: "/nope/nope", status: 404 },
  { path: "/next/markets", status: 200 },
  { path: "/design-system/en", status: 200 },
  ...designSystemLocales.map((locale) => ({
    path: `/design-system/${locale}/foundations/typography`,
    status: 200,
  })),
  { path: "/design-system/el/frame/foundations/colors", status: 200 },
];

for (const route of routes) {
  test(`${route.path} logs nothing to the console in next dev`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const consoleMessages: Message[] = [];
    const failedRequests: FailedRequest[] = [];
    collectConsole(page, consoleMessages, failedRequests);
    try {
      const response = await page.goto(route.path, { waitUntil: "load" });
      expect(response?.status(), `${route.path} answers ${route.status}`).toBe(route.status);
      // Dev validation logs after hydration and after the first client render; let both finish.
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1_500);
    } finally {
      await context.close();
    }
    const { local, judged, summary, failedLine } = judgeConsole(
      consoleMessages,
      failedRequests,
      baseURL,
      (message) =>
        excusedInDev(route.path, message) || isOwnNotFound(message, route, baseURL ?? ""),
    );
    console.log(
      `${route.path}: ${consoleMessages.length} console messages, ${judged.length} judged, ${judged.length - summary.length} excused; ${failedLine}` +
        (judged.length
          ? "\n" + judged.map((m) => `  ${m.type}: ${m.text} [${m.source}]`).join("\n")
          : ""),
    );
    expect(local, "no request to this server failed").toEqual([]);
    expect(summary).toEqual([]);
  });
}
