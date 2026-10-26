import type { VariantSelection } from "@shopblok/registry/contracts";
import { useSyncExternalStore } from "react";

// The choice the buy box island holds, for the gallery island beside it (D61: the chosen colour's
// pictures). The URL carries a full choice (`?variant=`); a colour alone is no variant, so this store
// carries what the URL cannot. The server snapshot is `null`, so the gallery's first paint follows
// the URL (or the default) and the published choice arrives after hydration. Keyed by the product:
// a client navigation to another product page starts from nothing.

type Published = { productId: string; selection: VariantSelection };

let published: Published | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The buy box island's choice, every time it changes. */
export function publishChoice(productId: string, selection: VariantSelection): void {
  if (published?.productId === productId && published.selection === selection) return;
  published = { productId, selection };
  for (const listener of [...listeners]) listener();
}

/** The choice published for `productId`, or `null` before the buy box island has published one. */
export function usePublishedChoice(productId: string): VariantSelection | null {
  const current = useSyncExternalStore(
    subscribe,
    () => published,
    () => null,
  );
  return current?.productId === productId ? current.selection : null;
}

/** Forgets the choice (a test). */
export function resetPublishedChoice(): void {
  published = null;
}
