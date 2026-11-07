// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a; WCAG 2.1.2,
// 2.4.3, 2.4.11). The promo popup's card, which `promo-popup.tsx` loads with `next/dynamic` when it
// shows an offer, so this module is in no route's first load (D102, `first-load.ts`' `keptOut`,
// marked by `displayName`). The frame is PromoPopupFrame (`corner`), put at the end of `<body>`
// (a portal), on the overlay layer. It takes no focus when it appears. It goes with its close
// button or with Escape pressed anywhere on the page, except inside a modal dialog (which Escape
// closes instead). Focus that was inside it when it goes returns to where it came from, so it is
// never left on nothing. While it is shown its height is kept clear at the end of the page, as the
// cookie banner's is (`reserveSpaceFor`), so a control the visitor tabs to is never hidden under it.
"use client";

import { reserveSpaceFor } from "@shopblok/ui/organisms/cookie-consent-reserve";
import { PromoPopupFrame } from "@shopblok/ui/sections/promo-banner/popup-frame";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PromoPopupCardProps = {
  labelledBy: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

/** Whether an Escape belongs to a modal dialog (a drawer, the search), which it closes instead. */
const inModal = (target: EventTarget | null) =>
  target instanceof Element && target.closest('[aria-modal="true"]') !== null;

function PromoPopupCard({ labelledBy, closeLabel, onClose, children }: PromoPopupCardProps) {
  const [card, setCard] = useState<HTMLElement | null>(null);
  // WCAG 2.4.11: its height is kept clear at the end of the page while it is there.
  useEffect(() => (card === null ? undefined : reserveSpaceFor(card)), [card]);
  useEffect(() => {
    if (card === null) return;
    // Where focus came from when it entered the card, to give it back when the card goes.
    let cameFrom: HTMLElement | null = null;
    const onFocusIn = (event: FocusEvent) => {
      const from = event.relatedTarget;
      if (
        card.contains(event.target as Node) &&
        from instanceof HTMLElement &&
        !card.contains(from)
      )
        cameFrom = from;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || inModal(event.target)) return;
      close();
    };
    const close = () => {
      if (card.contains(document.activeElement) && cameFrom?.isConnected === true) cameFrom.focus();
      onClose();
    };
    const button = card.querySelector<HTMLButtonElement>('[data-slot="promo-popup-close"]');
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    button?.addEventListener("click", close);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      button?.removeEventListener("click", close);
    };
  }, [card, onClose]);
  return (
    <>
      {createPortal(
        <PromoPopupFrame
          ref={setCard}
          labelledBy={labelledBy}
          closeLabel={closeLabel}
          placement="corner"
        >
          {children}
        </PromoPopupFrame>,
        document.body,
      )}
    </>
  );
}

// The marker `first-load.ts` finds this module's chunk by (D102): no other source has it.
PromoPopupCard.displayName = "shopblok:promo-popup-card";

export default PromoPopupCard;
