// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D44). Which promo
// popups this visitor has seen: an offer (a `promoBanner` block's id) shows once per visitor, so
// the first time one is shown it is written to `localStorage` (functional storage, D44: it only
// remembers not to show the offer again, so no consent is asked, SPEC §11.4). Plain data and
// listeners, read through `useSyncExternalStore` as the visitor store is. An offer is `new` until
// a popup claims it, then `showing` for that popup alone (its `owner`, one token per mounted
// popup), then `done` once it is closed. A popup on the next page, a new owner, finds it `showing`
// or `done` and stays shut, so the offer is gone on the next page as the plan asks, with or without
// a reload. Storage that cannot be read counts as seen: an offer that cannot be remembered is not
// shown at all, rather than on every page.

const KEY = "shopblok:promo-popup:";

type Offer = { phase: "new" | "showing" | "done"; owner?: object };

const offers = new Map<string, Offer>();
const listeners = new Set<() => void>();

function offerOf(id: string): Offer {
  let offer = offers.get(id);
  if (offer === undefined) {
    let seen = true;
    try {
      seen = window.localStorage.getItem(KEY + id) !== null;
    } catch {
      // Unreadable storage: treated as seen (above).
    }
    offer = { phase: seen ? "done" : "new" };
    offers.set(id, offer);
  }
  return offer;
}

const notify = () => {
  for (const listener of [...listeners]) listener();
};

export function subscribePromoPopups(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether `owner`'s popup shows the offer now. */
export function isShowing(id: string, owner: object): boolean {
  const offer = offerOf(id);
  return offer.phase === "showing" && offer.owner === owner;
}

/** On the server, and while hydrating: never shown (a prerendered page is the same for all). */
export function isShowingOnServer(): boolean {
  return false;
}

/**
 * The popup `owner` shows the offer, if it is new: it is written down as seen at once, so a reload
 * or the next page does not show it again even if this one is never closed.
 */
export function claimOffer(id: string, owner: object): void {
  const offer = offerOf(id);
  if (offer.phase !== "new") return;
  try {
    window.localStorage.setItem(KEY + id, new Date().toISOString());
  } catch {
    // Kept for this page's life.
  }
  offers.set(id, { phase: "showing", owner });
  notify();
}

/** The visitor closed it (its button or Escape). */
export function closeOffer(id: string): void {
  offers.set(id, { phase: "done" });
  notify();
}

/** Forgets what this module read (a test, which changes storage under it). */
export function resetPromoPopups(): void {
  offers.clear();
}
