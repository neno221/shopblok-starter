// M6 D124 (T97): the shop's own events, in every first load and as small as it can be (D129). An
// island calls `track("product_viewed", { product: … })`; it does nothing without a PostHog key in
// the build (the literal `process.env.NEXT_PUBLIC_POSTHOG_KEY`, which `next build` replaces, so a
// keyless build drops the rest) and nothing without the visitor's analytics consent, read from the
// consent cookie at the moment of the call, so a withdrawal counts at once. With both, the event
// waits in a short queue until the loader (`loader.ts`, its own chunk with `posthog-js`, imported
// only after consent) takes it; the loader adds `market` and `locale` to every event.
import { readConsentCookie } from "../visitor/consent-cookie";

/** The six events of the shop (D124) and the browser's sign-up. */
export type ShopEvent =
  | "product_viewed"
  | "product_added_to_cart"
  | "cart_viewed"
  | "checkout_started"
  | "search_performed"
  | "market_switched"
  | "signed_up";

export type EventProperties = Record<string, string | number | boolean | null>;

type Sink = (event: ShopEvent, properties: EventProperties) => void;

/** At most this many events wait for the loader; the oldest are kept. */
export const QUEUE_LIMIT = 20;

const queue: [ShopEvent, EventProperties][] = [];
let sink: Sink | null = null;

/** Sends a shop event, or does nothing: no key in the build, or no analytics consent. */
export function track(event: ShopEvent, properties: EventProperties = {}): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (readConsentCookie()?.analytics !== true) {
    queue.length = 0;
    return;
  }
  if (sink !== null) sink(event, properties);
  else if (queue.length < QUEUE_LIMIT) queue.push([event, { ...properties }]);
}

/** The loader takes the events from here on, starting with those that waited. */
export function attachSink(next: Sink): void {
  sink = next;
  for (const [event, properties] of queue.splice(0)) next(event, properties);
}

/** Analytics stopped (consent withdrawn): nothing more is sent, and nothing waits. */
export function detachSink(): void {
  sink = null;
  queue.length = 0;
}
