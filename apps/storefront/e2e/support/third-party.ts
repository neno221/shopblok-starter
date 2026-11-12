// The keyless check (M6 D114, T93): a Playwright `test` whose every test fails when the browser sends
// a request to a third party an M6 integration talks to (Stripe, Resend, Sentry, PostHog, R2), or
// to the site's own `/monitoring` and `/ingest` tunnels. The rule and the hosts are in
// `third-party-hosts.ts`. e2e-smoke runs with no keys, so such a request means an integration's code
// loaded without its keys (D114: with no key the shop runs exactly as at M5's end).
//
// The shell, catalog, checkout and account suites import `test` and `expect` from here instead of
// `@playwright/test`. The fixture is automatic: it watches the test's own context and every context
// the test opens itself (`browser.newContext()`, `browser.newPage()`), records what it sees and
// fails the test at its end, naming each request by method, origin and path (never its query). It
// does not block the request, so the page behaves as it would, and the failure says what loaded.
// The suites under `e2e/integrations/` (the `integrations` project) use `@playwright/test` itself,
// since there the keys are set and these requests are the point.
import { expect, test as base, type BrowserContext } from "@playwright/test";
import { describeRequest, thirdPartyReason } from "./third-party-hosts";

export { THIRD_PARTY_DOMAINS, SAME_ORIGIN_TUNNELS, thirdPartyReason } from "./third-party-hosts";

// The fixture's second argument is Playwright's `use`, named `run` here: React's hooks rule reads a
// call to `use` inside `try` as a misplaced hook.
export const test = base.extend<{ noThirdPartyRequests: void }>({
  noThirdPartyRequests: [
    async ({ context, browser, baseURL }, run) => {
      const site = baseURL ?? "http://localhost:8000";
      const seen: string[] = [];
      const watched = new WeakSet<BrowserContext>();
      const watch = (target: BrowserContext) => {
        if (watched.has(target)) return;
        watched.add(target);
        target.on("request", (request) => {
          const reason = thirdPartyReason(request.url(), site);
          if (reason !== undefined) {
            seen.push(`${describeRequest(request.method(), request.url())}: ${reason}`);
          }
        });
      };
      watch(context);
      // `browser` is the worker's: the wrapper is an own property, removed after the test whatever
      // its outcome, so the prototype's method is back for the next one. `newPage()` opens its
      // context through `newContext()`, so one wrapper covers both.
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...args: Parameters<typeof browser.newContext>) => {
        const opened = await newContext(...args);
        watch(opened);
        return opened;
      };
      try {
        await run();
      } finally {
        Reflect.deleteProperty(browser, "newContext");
      }
      expect(
        seen,
        "the browser sent requests to a third party in a keyless suite (M6 D114): an integration's code loaded without its keys",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
