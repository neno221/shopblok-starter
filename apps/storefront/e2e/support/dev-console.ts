import { errors, expect, test, type Page, type Request } from "@playwright/test";
import { collectConsole, judgeConsole, type FailedRequest, type Message } from "./console";
import { excusedInDev, isOwnNotFound } from "./dev-console-excuses";

// The check behind `dev-console.spec.ts` (T25: the storefront's own routes, in e2e-smoke) and
// `dev-console-ds.spec.ts` (T27: the DS pages, in the design-system job): each route in `next dev`,
// judged by the console rules of `payload-admin.spec.ts` (console.ts). ADR 0001 measured the
// Payload admin there and found it noisy; it never measured the storefront's pages. The admin stays
// out (ADR 0001's decision), and so does anything under /api.
//
// Each route is opened in a page of its own, so a message belongs to the route that logged it, and
// the first visit to a route compiles it (the test timeout allows 90 s). A message is either ours
// and fixed, or Next's or React's dev-only validation and then excused by its exact text and route
// in dev-console-excuses.ts, with the upstream issue if one exists.

/** A route to open, and the status it answers. */
export type DevRoute = { path: string; status: number };

// How long a page is watched after `networkidle`. Dev validation logs after hydration and after the
// first client render, and a message that comes later is lost when the context closes: on a slow
// runner a route could report clean that is not. There is no event to wait for instead, so this is
// a margin (3 s; it was 1.5 s). Raise it if a message is ever seen to arrive late.
const settleMs = 3_000;

// How long `networkidle` may take after `load`. CI run 38985341436 (PR 48): about one route in
// four never reached it on the runner and failed at the 90 s test timeout with no clue, although
// `next dev` answered every request in under 2 s; off the runner it comes 0.5 s after `load`
// (SETUP.md, "The wait for networkidle (PR 48)"). Run 38988638454 then timed out once at this margin
// with no request open. Past it the test names the requests still open and the ones that started
// in the last `recentMs`; see `waitForIdle`.
const idleMs = 30_000;
const recentMs = 5_000;

// What a page loads to render: while one of these is open, the first client render may not have
// run, so a clean console proves nothing.
const renderTypes = new Set(["document", "script", "stylesheet"]);

/** What `waitForIdle` reports from: the requests still open, and when each request started. */
type Requests = { open: Map<Request, number>; started: { line: string; at: number }[] };

/** Records a page's requests (every frame's, as `networkidle` counts them) into `Requests`. */
function trackRequests(page: Page): Requests {
  const requests: Requests = { open: new Map(), started: [] };
  page.on("request", (request) => {
    requests.open.set(request, Date.now());
    requests.started.push({ line: `${request.resourceType()} ${request.url()}`, at: Date.now() });
  });
  page.on("requestfinished", (request) => requests.open.delete(request));
  page.on("requestfailed", (request) => requests.open.delete(request));
  return requests;
}

/**
 * Waits for `networkidle`, bounded by `idleMs`. On a time-out it lists the requests still open:
 * one of this server's documents, scripts or stylesheets fails the test (the render may be
 * incomplete); anything else (a font, an image, a fetch) is a warning, and the check goes on. The
 * requests that started in the last `recentMs`, counted by URL, follow: with none open, they show
 * whether something kept starting requests (`networkidle` needs 500 ms without one) or nothing did.
 */
async function waitForIdle(page: Page, path: string, requests: Requests, baseURL: string) {
  const { open } = requests;
  const timedOut = await page
    .waitForLoadState("networkidle", { timeout: idleMs })
    .then(() => false)
    .catch((error: unknown) => {
      if (error instanceof errors.TimeoutError) return true;
      throw error;
    });
  if (!timedOut) return;
  const now = Date.now();
  const list = [...open].map(([request, since]) => ({
    line: `${request.resourceType()} ${request.url()} (open ${Math.round((now - since) / 1000)} s)`,
    blocksRender:
      renderTypes.has(request.resourceType()) &&
      new URL(request.url()).origin === new URL(baseURL).origin,
  }));
  const recent = new Map<string, number>();
  for (const { line, at } of requests.started)
    if (now - at <= recentMs) recent.set(line, (recent.get(line) ?? 0) + 1);
  const report =
    `${path}: no networkidle within ${idleMs / 1000} s; open requests:\n` +
    (list.map((r) => `  ${r.line}`).join("\n") || "  none") +
    `\nstarted in the last ${recentMs / 1000} s:\n` +
    ([...recent].map(([line, count]) => `  ${count} × ${line}`).join("\n") || "  none");
  console.warn(report);
  expect(
    list.filter((r) => r.blocksRender).map((r) => r.line),
    report,
  ).toEqual([]);
}

/** One test per route: it answers its status and logs nothing that is not excused. */
export function checkRoutesInDev(routes: readonly DevRoute[]): void {
  test.setTimeout(90_000);
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
      const requests = trackRequests(page);
      try {
        const response = await page.goto(route.path, { waitUntil: "load" });
        expect(response?.status(), `${route.path} answers ${route.status}`).toBe(route.status);
        // Let hydration and the first client render finish, then the margin above.
        await waitForIdle(page, route.path, requests, baseURL);
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
}
