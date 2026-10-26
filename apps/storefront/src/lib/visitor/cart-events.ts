// T52: "a product was added", from the buy box to the header's cart island, which opens the quick
// cart on it. A window event rather than the visitor store: an add is news once, not a state a
// later page should find (the store keeps the count, which `setCartCount` sets beside this).

const ADDED = "shopblok:cart-added";

/** Says that the visitor's line `lineId` has just been added to. */
export function announceAdded(lineId: string): void {
  window.dispatchEvent(new CustomEvent(ADDED, { detail: { lineId } }));
}

/** Calls `listener` with the line of each add; answers the function that stops it. */
export function onAdded(listener: (lineId: string) => void): () => void {
  const handle = (event: Event) => {
    const lineId = (event as CustomEvent<{ lineId?: unknown }>).detail?.lineId;
    if (typeof lineId === "string") listener(lineId);
  };
  window.addEventListener(ADDED, handle);
  return () => window.removeEventListener(ADDED, handle);
}
