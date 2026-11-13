import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./options";

// The browser's SDK (M6 D125, D129, T96). Never in a first load: `instrumentation-client.ts` imports
// this module once the page is idle, or the error boundaries when they report, and only in a build
// with a DSN. Events go to the site's own `/monitoring` (`app/monitoring/route.ts`), not to Sentry's
// host. The `loader` tag's value is this module's marker for `scripts/first-load.ts` (D102's check
// that the SDK's chunk is kept out).

let started = false;

/** Starts the SDK once, then reports what the queue kept while the page loaded. */
export function start(queued: readonly unknown[] = []) {
  if (!started) {
    started = true;
    Sentry.init({
      ...sentryOptions(),
      tunnel: "/monitoring",
      initialScope: { tags: { loader: "shopblok:sentry-browser" } },
    });
  }
  for (const error of queued) Sentry.captureException(error);
}

/** An error a boundary caught (React keeps those from `window.onerror`). */
export function capture(error: unknown) {
  start();
  Sentry.captureException(error);
}
