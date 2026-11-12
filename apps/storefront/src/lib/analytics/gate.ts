// M6 D124 (T97): what starts and stops PostHog in the browser. The consent island runs it only in a
// build with a key (`cookie-consent.tsx`, behind the literal `process.env.NEXT_PUBLIC_POSTHOG_KEY`),
// so a keyless build holds none of it. It reads the consent cookie after hydration and after each
// choice (`onConsentChange`): with analytics consent it imports the loader (`loader.ts`, the chunk
// with `posthog-js`, D129) once and starts it; without, or once withdrawn, it stops it at once, which
// clears PostHog's cookie and storage. It also follows the visitor store's customer: a signed-in
// customer is identified by their Medusa id, and a sign-out starts a new anonymous visitor.
import { syncCartConsent } from "../actions/consent";
import { onConsentChange } from "../visitor/consent";
import { readConsentCookie } from "../visitor/consent-cookie";
import { getSnapshot, subscribe } from "../visitor/store";
import type * as LoaderModule from "./loader";
import type { AnalyticsContext } from "./loader";
import { clearPosthogStorage, hasPosthogStorage } from "./storage";

type Loader = typeof LoaderModule;

/** The store's customer: their id, `null` for a guest, `undefined` while the store does not know. */
function customerId(): string | null | undefined {
  const visitor = getSnapshot();
  if (visitor === "unknown") return undefined;
  return visitor.customer?.id ?? null;
}

/**
 * Starts watching; returns the function that stops watching. `load` is the
 * loader's import, a parameter for the test.
 */
export function watchAnalytics(
  context: AnalyticsContext,
  // The literal guard: a keyless build has no loader chunk at all (`first-load.ts`'s "not built").
  load: () => Promise<Loader> = () =>
    process.env.NEXT_PUBLIC_POSTHOG_KEY
      ? import("./loader")
      : Promise.reject(new Error("No PostHog key in this build")),
): () => void {
  let loader: Promise<Loader> | null = null;
  let on = false;

  const identify = (module: Loader) => {
    const id = customerId();
    if (on && id !== undefined) module.syncIdentity(id);
  };

  /** `chosen`: the visitor has just given consent on this page (not a page opened with it). */
  const apply = (chosen = false) => {
    const wanted = readConsentCookie()?.analytics === true;
    if (wanted && !on) {
      on = true;
      loader ??= load();
      void loader.then((module) => {
        if (!on) return;
        module.startAnalytics(context);
        identify(module);
        // A yes given on this page: the cart learns the distinct id PostHog has just made (D124).
        // A page opened with consent needs none; every cart write carries the id from its cookie.
        if (chosen) void syncCartConsent().catch(() => undefined);
      });
    } else if (!wanted && on) {
      on = false;
      void loader?.then((module) => module.stopAnalytics());
    } else if (!wanted) {
      // No consent, but PostHog's storage from before (withdrawn in another tab): removed.
      if (hasPosthogStorage()) clearPosthogStorage();
    } else {
      void loader?.then(identify);
    }
  };

  apply();
  const stops = [onConsentChange(() => apply(true)), subscribe(() => apply())];
  // Stops watching only: PostHog keeps running for the page (React mounts an effect twice in
  // development, and a withdrawal is the only thing that stops it).
  return () => {
    for (const stop of stops) stop();
  };
}
