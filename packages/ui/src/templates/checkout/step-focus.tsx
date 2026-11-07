// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; WCAG 2.4.3). The `one-page` checkout's
// focus on the step it lands on: each step's action comes back to the page at the step's anchor
// (`…/checkout/delivery#main-step-delivery`). Without scripts the browser moves focus to the anchor's
// section itself (it can take focus: `tabIndex={-1}`); a navigation by the router scrolls to it but
// leaves focus where it was, so this moves it there once the page shows the step. It does nothing
// when the address has no anchor of this step (a first visit: focus stays at the page's start).
// `token` changes with each answer (a failed step comes back to the same step with a new flash), so
// each one is focused again. A client component; it draws nothing.
"use client";

import { useEffect } from "react";

function CheckoutStepFocus({ id, token }: { id: string; token?: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const target = document.getElementById(id);
    if (target !== null && document.activeElement !== target) target.focus({ preventScroll: true });
  }, [id, token]);
  return null;
}

export { CheckoutStepFocus };
