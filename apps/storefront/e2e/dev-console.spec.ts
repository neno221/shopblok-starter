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

// How long a page is watched after `networkidle`. Dev validation logs after hydration and after the
// first client render, and a message that comes later is lost when the context closes: on a slow
// runner a route could report clean that is not. There is no event to wait for instead, so this is
// a margin (3 s; it was 1.5 s). Raise it if a message is ever seen to arrive late.
const settleMs = 3_000;

// Plan T25 step 1: "one atom page in each of the four locales". Select is the atom page with the
// most client code (Base UI's list box, its portal and positioning), added by T21; the Foundations
// page stays as T25 left it.
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
  ...designSystemLocales.map((locale) => ({
    path: `/design-system/${locale}/atoms/select`,
    status: 200,
  })),
  { path: "/design-system/el/frame/foundations/colors", status: 200 },
];

for (const route of routes) {
  test(`${route.path} logs nothing to the console in next dev`, async ({ browser, baseURL }) => {
    // The config sets it; without it `new URL(path, "")` would throw "Invalid base URL" inside the
    // excuse callback, far from the cause.
    if (!baseURL)
      throw new Error(
        "dev-console needs a baseURL: playwright.config.ts sets E2E_BASE_URL or http://localhost:8000.",
      );
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const consoleMessages: Message[] = [];
    const failedRequests: FailedRequest[] = [];
    collectConsole(page, consoleMessages, failedRequests);
    try {
      const response = await page.goto(route.path, { waitUntil: "load" });
      expect(response?.status(), `${route.path} answers ${route.status}`).toBe(route.status);
      // Let hydration and the first client render finish, then the margin above.
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(settleMs);
    } finally {
      // CI run 38876631305: two routes passed every step above and then sat in `context.close()`
      // until the 90 s test timeout (the console was never judged; the server log was clean). Not
      // reproduced off the runner (SETUP.md, "Code-review fixes (PR 41)"). The close is bounded, so
      // a stuck browser costs 20 s and a warning instead of the test, and the console below is
      // judged either way; the worker's teardown deals with the browser.
      const closed = await Promise.race([
        context.close().then(
          () => true,
          () => true,
        ),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 20_000)),
      ]);
      if (!closed) console.warn(`${route.path}: context.close() did not return within 20 s`);
    }
    const { local, judged, summary, failedLine } = judgeConsole(
      consoleMessages,
      failedRequests,
      baseURL,
      (message) => excusedInDev(route.path, message) || isOwnNotFound(message, route, baseURL),
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
