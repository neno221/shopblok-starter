import type { ProductCard } from "@shopblok/registry/contracts";

// The visitor's recently viewed products (D61): a list in `localStorage`, per market (a card's price
// is in the market's currency), newest first, read through `useSyncExternalStore` as the recent
// searches are. Functional storage, so no consent is asked (SPEC §11.4). The server snapshot is
// empty: the list is the visitor's (D44). A card is the one the product page drew when the visitor
// was there, so its price is as it was then; viewing the product again replaces it. What is read
// back is checked, because anything can be in storage: a card whose links or picture are not this
// site's paths (or an https or data picture) is dropped, so a stored `javascript:` link never
// reaches an `href`. Storage that throws leaves the list empty.

const KEY = "shopblok:recently-viewed";
/** The row shows eight; one more is kept, since the page leaves its own product out. */
export const MAX_RECENTLY_VIEWED = 9;

type Stored = Record<string, ProductCard[]>;

const EMPTY: readonly ProductCard[] = Object.freeze([]);
let stored: Stored | undefined;
const snapshots = new Map<string, readonly ProductCard[]>();
const listeners = new Set<() => void>();

const isPath = (value: unknown) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
const isPicture = (value: unknown) =>
  isPath(value) ||
  (typeof value === "string" && (value.startsWith("https://") || value.startsWith("data:image/")));

/** Whether a stored value is a card this site could have drawn. */
export function isStoredCard(value: unknown): value is ProductCard {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Partial<ProductCard>;
  return (
    typeof card.id === "string" &&
    typeof card.handle === "string" &&
    typeof card.title === "string" &&
    isPath(card.href) &&
    Array.isArray(card.images) &&
    card.images.length > 0 &&
    card.images.every((image) => isPicture(image?.src)) &&
    typeof card.price?.price?.amount === "number" &&
    typeof card.price.price.currencyCode === "string" &&
    Array.isArray(card.badges) &&
    Array.isArray(card.swatches) &&
    typeof card.variantCount === "number" &&
    typeof card.stock?.status === "string"
  );
}

function read(): Stored {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([market, cards]) =>
        Array.isArray(cards)
          ? [[market, cards.filter(isStoredCard).slice(0, MAX_RECENTLY_VIEWED)]]
          : [],
      ),
    );
  } catch {
    return {};
  }
}

function all(): Stored {
  stored ??= read();
  return stored;
}

export function subscribeRecentlyViewed(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The market's list, newest first; the same array until it changes. */
export function getRecentlyViewed(market: string): readonly ProductCard[] {
  const cards = all()[market] ?? EMPTY;
  const previous = snapshots.get(market);
  if (
    previous !== undefined &&
    previous.length === cards.length &&
    previous.every((c, i) => c === cards[i])
  )
    return previous;
  snapshots.set(market, cards);
  return cards;
}

export function getServerRecentlyViewed(): readonly ProductCard[] {
  return EMPTY;
}

/** Puts the card first in its market's list, once, and keeps the newest nine. */
export function rememberViewed(market: string, card: ProductCard): void {
  const current = all();
  const rest = (current[market] ?? []).filter((entry) => entry.id !== card.id);
  const next = {
    ...current,
    [market]: [card, ...rest].slice(0, MAX_RECENTLY_VIEWED),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this page only.
  }
  stored = next;
  for (const listener of [...listeners]) listener();
}

/** Forgets what this module read (a test, which changes storage under it). */
export function resetRecentlyViewed(): void {
  stored = undefined;
  snapshots.clear();
}
