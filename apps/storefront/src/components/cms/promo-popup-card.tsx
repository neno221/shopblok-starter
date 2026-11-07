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
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  // Where focus came from when it entered the card, to give it back when the card goes.
  const cameFrom = useRef<HTMLElement | null>(null);
  const close = useCallback(() => {
    const from = cameFrom.current;
    if (card?.contains(document.activeElement) === true && from?.isConnected === true) from.focus();
    onClose();
  }, [card, onClose]);
  // WCAG 2.4.11: its height is kept clear at the end of the page while it is there.
  useEffect(() => (card === null ? undefined : reserveSpaceFor(card)), [card]);
  useEffect(() => {
    if (card === null) return;
    // The event's `relatedTarget`, or the last element focused outside the card when the browser
    // gives none (a focus that started where the browser has no element to name, such as the page).
    const active = document.activeElement;
    let outside = active instanceof HTMLElement && !card.contains(active) ? active : null;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !card.contains(target)) {
        if (target instanceof HTMLElement) outside = target;
        return;
      }
      const from = event.relatedTarget;
      if (from instanceof Node && card.contains(from)) return;
      cameFrom.current = from instanceof HTMLElement ? from : outside;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || inModal(event.target)) return;
      close();
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [card, close]);
  // In a fragment: `react-dom`'s portal type comes from another copy of `@types/react` than this
  // component's, and `next/dynamic` refuses it as the component's return type otherwise.
  return (
    <>
      {createPortal(
        <PromoPopupFrame
          ref={setCard}
          labelledBy={labelledBy}
          closeLabel={closeLabel}
          onClose={close}
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
