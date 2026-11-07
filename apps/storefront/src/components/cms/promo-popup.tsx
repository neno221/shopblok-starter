// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D44, D102; WCAG
// 2.4.11). The `popup` promo banner's island: it shows the offer's card at the window's end corner
// once per visitor and offer, and only after the cookie banner has been answered, so it never opens
// before that answer or over the banner. The server and the first render in the browser draw
// nothing (the visitor store says "unknown" and the popups' store "not shown", D44), so a
// prerendered page is the same for everyone. The card's code (`promo-popup-card.tsx`: the frame,
// Escape, the reserved space, the portal) is loaded by `next/dynamic` only when this decides to
// show it, so it is in no route's first load (D102; `first-load.ts`' `keptOut`). The card's
// contents come from the server (the popup member draws them), so nothing here formats a word.
"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  claimOffer,
  closeOffer,
  isShowing,
  isShowingOnServer,
  subscribePromoPopups,
} from "../../lib/visitor/promo-popups";
import { useVisitor } from "../../lib/visitor/use-visitor";

const PromoPopupCard = dynamic(() => import("./promo-popup-card"), { ssr: false });

export type PromoPopupProps = {
  /** The offer: the block's id, which the visitor sees once. */
  offer: string;
  /** The id of the offer's heading in `children`, which names the card. */
  labelledBy: string;
  /** "Close", the close button's name. */
  closeLabel: string;
  /** The card's contents, drawn on the server. */
  children: ReactNode;
};

export function PromoPopup({ offer, labelledBy, closeLabel, children }: PromoPopupProps) {
  const visitor = useVisitor();
  // Only once the cookie banner is answered (it is shown while `consent` is null).
  const answered = visitor !== "unknown" && visitor.consent !== null;
  // One token per mounted popup: the offer shows for the popup that claimed it, and no other.
  const [owner] = useState(() => ({}));
  const open = useSyncExternalStore(
    subscribePromoPopups,
    () => isShowing(offer, owner),
    isShowingOnServer,
  );
  useEffect(() => {
    if (answered) claimOffer(offer, owner);
  }, [answered, offer, owner]);
  const close = useCallback(() => closeOffer(offer), [offer]);
  return open ? (
    <PromoPopupCard labelledBy={labelledBy} closeLabel={closeLabel} onClose={close}>
      {children}
    </PromoPopupCard>
  ) : null;
}
