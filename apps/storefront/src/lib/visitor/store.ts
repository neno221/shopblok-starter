// D44 (T35, ADR 0004): what the browser knows about the visitor and a prerendered page cannot: the
// number of items in the cart and (T36) what they chose about cookies. A small external store that
// `useVisitor` reads with `useSyncExternalStore`; its server snapshot is "unknown", so a page
// rendered at build time or on the server never holds a visitor's value, whatever the store holds,
// and the browser fills it in after hydration. M2 gives it no source; M3 adds one, a route handler
// that reads the httpOnly cart cookie (SPEC §8.2), which the browser cannot read itself. The design
// system feeds it from fixtures (`design-system/components/visitor-fixture.tsx`), so its pages run
// the real island. Plain data and listeners, with no React: a snapshot stays the same object until
// the value changes, because `useSyncExternalStore` compares snapshots with `Object.is` and a new
// object on every read would render forever. The consent choice will live in a cookie the browser
// can read (M6 wires PostHog to it, SPEC §8.4); until then the store holds it for the page's life.
// M3 (T47, D60) gives the store its source, `source.ts`, which asks `/next/visitor` once after
// hydration: the count, the signed-in customer's first name and the market suggestion.
import type { ConsentChoice, MarketSuggestion } from "@shopblok/registry/contracts";

/** The signed-in customer, as far as a page shows them (the header's greeting). */
export type VisitorCustomer = { firstName: string | null };

/** The market the banner suggests (D66), with its key for the `rememberMarket` action. */
export type VisitorSuggestion = MarketSuggestion & { market: string };

/** What the browser knows about the visitor. */
export type Visitor = {
  /** The number of items in the cart. */
  cartCount: number;
  /** What they chose about cookies (T36), or `null` before they choose: the banner is then shown. */
  consent: ConsentChoice | null;
  /** The signed-in customer, or `null` for a guest. */
  customer: VisitorCustomer | null;
  /** Another market to offer, or `null`: none, or the visitor chose one already. */
  suggestion: VisitorSuggestion | null;
};

/** A full answer as the callers give it: a guest with nothing to suggest unless they say. */
export type VisitorInput = Omit<Visitor, "customer" | "suggestion"> &
  Partial<Pick<Visitor, "customer" | "suggestion">>;

/** The store's value: the visitor's, or "unknown" until the browser has it (and always on the server). */
export type VisitorSnapshot = Visitor | "unknown";

let current: VisitorSnapshot = "unknown";
const listeners = new Set<() => void>();

/** Calls `listener` after each change; returns the function that stops it. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The browser's value. */
export function getSnapshot(): VisitorSnapshot {
  return current;
}

/** The server's: never a visitor's value, so a prerendered page is the same for everyone (D44). */
export function getServerSnapshot(): VisitorSnapshot {
  return "unknown";
}

/**
 * Sets what the browser knows, the whole of it: the first, full answer (from an effect, or from a
 * request in M3). A later change to one part goes through `setCartCount` or `setConsent`, which keep
 * the other, so a new count never brings back a banner the visitor has answered (PR 58 review). On
 * the server the store would be the process's, shared by every request; the server snapshot
 * ignores it anyway.
 */
export function setVisitor(input: VisitorInput): void {
  const next: Visitor = { customer: null, suggestion: null, ...input };
  if (
    current !== "unknown" &&
    current.cartCount === next.cartCount &&
    sameConsent(current, next) &&
    sameCustomer(current.customer, next.customer) &&
    sameSuggestion(current.suggestion, next.suggestion)
  )
    return;
  current = {
    cartCount: next.cartCount,
    consent: next.consent === null ? null : { ...next.consent },
    customer: next.customer === null ? null : { ...next.customer },
    suggestion: next.suggestion === null ? null : structuredClone(next.suggestion),
  };
  for (const listener of [...listeners]) listener();
}

/**
 * Records the visitor's choice about cookies (CookieConsent's accept, reject or save). Only a known
 * visitor can choose: the banner is not drawn before the browser knows them, so an unknown store
 * stays unknown.
 */
export function setConsent(consent: ConsentChoice): void {
  if (current === "unknown") return;
  setVisitor({ ...current, consent });
}

/**
 * A new number of items in the cart (after an add to cart, M3), keeping the visitor's cookie choice.
 * Like `setConsent`, it changes a known visitor only: before the first full answer it does nothing.
 */
export function setCartCount(cartCount: number): void {
  if (current === "unknown") return;
  setVisitor({ ...current, cartCount });
}

function sameCustomer(a: VisitorCustomer | null, b: VisitorCustomer | null): boolean {
  if (a === null || b === null) return a === b;
  return a.firstName === b.firstName;
}

function sameSuggestion(a: VisitorSuggestion | null, b: VisitorSuggestion | null): boolean {
  if (a === null || b === null) return a === b;
  return a.market === b.market && a.suggested.href === b.suggested.href && a.message === b.message;
}

function sameConsent(a: Visitor, b: Visitor): boolean {
  if (a.consent === null || b.consent === null) return a.consent === b.consent;
  return a.consent.analytics === b.consent.analytics && a.consent.marketing === b.consent.marketing;
}

/** Forgets the visitor: back to "unknown" (a sign-out, a test). */
export function resetVisitor(): void {
  if (current === "unknown") return;
  current = "unknown";
  for (const listener of [...listeners]) listener();
}
