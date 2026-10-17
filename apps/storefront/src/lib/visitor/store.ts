// D44 (T35, ADR 0004): what the browser knows about the visitor and a prerendered page cannot, for
// now the number of items in the cart. A small external store that `useVisitor` reads with
// `useSyncExternalStore`; its server snapshot is "unknown", so a page rendered at build time or on
// the server never holds a visitor's value, whatever the store holds, and the browser fills it in
// after hydration. M2 gives it no source; M3 adds one, a route handler that reads the httpOnly cart
// cookie (SPEC §8.2), which the browser cannot read itself. The design system feeds it from fixtures
// (`design-system/components/visitor-fixture.tsx`), so its pages run the real island. Plain data and
// listeners, with no React: a snapshot stays the same object until the value changes, because
// `useSyncExternalStore` compares snapshots with `Object.is` and a new object on every read would
// render forever.

/** What the browser knows about the visitor. */
export type Visitor = {
  /** The number of items in the cart. */
  cartCount: number;
};

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
 * Sets what the browser knows: from an effect, or from the answer of a request (M3). On the server
 * the store would be the process's, shared by every request; the server snapshot ignores it anyway.
 */
export function setVisitor(next: Visitor): void {
  if (current !== "unknown" && current.cartCount === next.cartCount) return;
  current = { cartCount: next.cartCount };
  for (const listener of [...listeners]) listener();
}

/** Forgets the visitor: back to "unknown" (a sign-out, a test). */
export function resetVisitor(): void {
  if (current === "unknown") return;
  current = "unknown";
  for (const listener of [...listeners]) listener();
}
