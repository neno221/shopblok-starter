// M6 D124 (T97): PostHog in the browser, in a chunk of its own that the consent island imports only
// once the visitor has said yes to analytics and the build has a key (never in a first load, D129;
// `scripts/first-load.ts` keeps it out by the marker below). `posthog-js`'s slim build without
// external scripts: the shop uses none of its extensions (no autocapture, replay, surveys, flags or
// toolbar), and nothing loads from PostHog's CDN. Everything goes through the site's own `/ingest`
// (Next's rewrites to the EU host, `next.config.ts`).
//
// - **Consent is ours.** PostHog starts opted out with no storage (`opt_out_capturing_by_default`,
//   `opt_out_persistence_by_default`), and `start` opts in: only then does it keep its cookie and
//   local storage. `stop` (consent withdrawn) clears PostHog's own opt-in, which with those two
//   options means opted out and no storage again: its cookie and local storage are removed, then
//   whatever of PostHog's is left in the browser is swept (`clearPosthogStorage`). A later yes on the
//   same page opts in again.
// - **What is sent:** page views (the first, and each navigation, `history_change`), the shop's
//   events from `track()`, and `$pageleave`; `market` and `locale` on every one (`register`). No
//   autocapture (D124: no text of the page leaves it), no replay, no feature flags, no surveys.
//   Person profiles only for an identified customer, by their Medusa id (`identify`), never their
//   e-mail; `syncIdentity(null)` after a sign-out starts a new anonymous visitor (`reset`).
import posthog from "posthog-js/dist/module.slim.no-external";
import { clearPosthogStorage } from "./storage";
import { attachSink, detachSink } from "./track";

/**
 * `first-load.ts`'s marker for this chunk (D129), also left on `window` once PostHog starts, so a
 * test can tell whether the loader ran.
 */
export const LOADER_MARKER = "shopblok:posthog-loader";

export type AnalyticsContext = {
  /** The project's key (`NEXT_PUBLIC_POSTHOG_KEY`). */
  key: string;
  /** The ingest host the site's `/ingest` forwards to; the app's link to PostHog follows it. */
  host: string;
  /** The page's market key and its Medusa locale (`el-GR`), sent with every event, as Medusa's. */
  market: string;
  locale: string;
};

let started = false;
let running = false;
/** What every event carries (`register`), again after a `reset`. */
let superProperties: { market: string; locale: string } = { market: "", locale: "" };

/** PostHog's app for an ingest host (`eu.i.posthog.com` → `eu.posthog.com`), or none for another. */
export function uiHost(host: string): string | undefined {
  const match = /^https:\/\/(eu|us)\.i\.posthog\.com\/?$/.exec(host);
  return match === null ? undefined : `https://${match[1]}.posthog.com`;
}

/** The options `posthog.init` gets (exported for the test). */
export function posthogOptions(context: AnalyticsContext) {
  const ui = uiHost(context.host);
  return {
    api_host: "/ingest",
    ...(ui === undefined ? {} : { ui_host: ui }),
    // Opted out, without storage, until `start` opts in (the shop's consent is the cookie's).
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    persistence: "localStorage+cookie" as const,
    person_profiles: "identified_only" as const,
    capture_pageview: "history_change" as const,
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_performance: false,
    capture_heatmaps: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    advanced_disable_toolbar_metrics: true,
  };
}

/** Starts PostHog for this page (once), or opts it in again after a withdrawal on this page. */
export function startAnalytics(context: AnalyticsContext): void {
  if (running) return;
  running = true;
  superProperties = { market: context.market, locale: context.locale };
  const begin = () => {
    posthog.register(superProperties);
    posthog.opt_in_capturing({ captureEventName: false });
    attachSink((event, properties) => {
      posthog.capture(event, properties);
    });
  };
  if (started) {
    begin();
    return;
  }
  started = true;
  Reflect.set(window, "__shopblokAnalytics", LOADER_MARKER);
  posthog.init(context.key, { ...posthogOptions(context), loaded: begin });
}

/**
 * Stops PostHog (consent withdrawn): nothing more is captured, and its cookie and storage go. Safe
 * to call when it never started.
 */
export function stopAnalytics(): void {
  detachSink();
  if (running) posthog.clear_opt_in_out_capturing();
  running = false;
  clearPosthogStorage();
}

/** A signed-in customer by their Medusa id; `null` after a sign-out, which starts a new visitor. */
export function syncIdentity(customerId: string | null): void {
  if (!running) return;
  const identified = posthog.get_property("$user_state") === "identified";
  if (customerId !== null) {
    if (posthog.get_distinct_id() !== customerId) posthog.identify(customerId);
  } else if (identified) {
    posthog.reset();
    posthog.register(superProperties);
  }
}

/** PostHog's distinct id for this visitor, or `null` while it is not running. */
export function distinctId(): string | null {
  return running ? posthog.get_distinct_id() : null;
}
