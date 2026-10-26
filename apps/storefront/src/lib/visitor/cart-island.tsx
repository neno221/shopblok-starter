// T52 (D65, SBP cart-popup.md): the header's cart as a browser island. Until a script runs it is
// the header's cart link (VisitorCartButton, with the count once the visitor store has it), which
// opens the cart page. A plain click opens the cart drawer instead: the island asks the server to
// render it (`renderCartDrawer`, the cookie's cart in the market's language) and draws it open. The
// drawer's forms post to the cart page's actions; the island catches each submit and sends it to
// `changeCartInDrawer`, which answers the drawer again, so a change stays in the drawer. After an
// add on a product page (`onAdded`) it draws the quick cart, open, on the line just added. Each
// popup stands in the header's cart link (its button looks the same): the quick cart while it is
// open, the drawer from its first opening on, so focus goes back to its button when it closes, and
// the drawer is read again each time it opens. A failed read opens the cart page.
"use client";

import { CartDrawerClient } from "@shopblok/ui/organisms/cart-drawer-client";
import { QuickCartDropdownClient } from "@shopblok/ui/organisms/quick-cart-dropdown-client";
import { useEffect, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import {
  changeCartInDrawer,
  renderCartDrawer,
  renderQuickCart,
  type DrawerParts,
  type QuickParts,
} from "../actions/cart-islands";
import { VisitorCartButton, type VisitorCartButtonProps } from "./cart-button";
import { onAdded } from "./cart-events";
import { setCartCount } from "./store";

export type CartIslandProps = VisitorCartButtonProps & {
  /** The market's key, for the actions. */
  market: string;
};

type Shown =
  | { kind: "link" }
  | { kind: "drawer"; parts: DrawerParts; open: boolean }
  | { kind: "quick"; parts: QuickParts };

/** Which of the drawer's forms sent a submit: its promotion field's two, a line's quantity or remove. */
function intentOf(form: HTMLFormElement): string | null {
  const slot = form.dataset["slot"];
  if (slot === "promo-code-remove") return "remove-code";
  if (slot === "promo-code-apply") return "apply-code";
  if (form.elements.namedItem("lineId") === null) return null;
  return form.elements.namedItem("quantity") === null ? "remove" : "update";
}

const plain = (event: ReactMouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function CartIsland({ market, ...button }: CartIslandProps) {
  const [shown, setShown] = useState<Shown>({ kind: "link" });

  useEffect(
    () =>
      onAdded((lineId) => {
        renderQuickCart(market, lineId).then(
          (parts) => {
            if (parts !== null) setShown({ kind: "quick", parts });
          },
          () => undefined,
        );
      }),
    [market],
  );

  /** The drawer, read again and drawn open; the cart page when it cannot be read. */
  const showDrawer = () => {
    const toCartPage = () => window.location.assign(button.href);
    renderCartDrawer(market).then((answer) => {
      if (answer === null) toCartPage();
      else setShown({ kind: "drawer", parts: answer.parts, open: true });
    }, toCartPage);
  };

  const openDrawer = (event: ReactMouseEvent) => {
    const link = (event.target as Element).closest('a[data-slot="cart-button"]');
    if (link === null || !plain(event)) return;
    event.preventDefault();
    showDrawer();
  };

  /** The drawer stays once closed, its button in the link's place, so focus goes back to it. */
  const drawerOpenChange = (open: boolean) => {
    if (open) showDrawer();
    else setShown((current) => (current.kind === "drawer" ? { ...current, open: false } : current));
  };

  /** The quick cart closed: the link again; focus goes back to what had it before the add. */
  const quickOpenChange = (open: boolean) => {
    if (!open) setShown({ kind: "link" });
  };

  const change = (event: FormEvent<HTMLSpanElement>) => {
    const form = event.target;
    if (shown.kind !== "drawer" || !(form instanceof HTMLFormElement)) return;
    const intent = intentOf(form);
    if (intent === null) return;
    // Caught before React's own handling of the form's action, which then leaves it.
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(form, submitter);
    changeCartInDrawer(market, intent, data).then(
      (answer) => {
        if (answer === null) return;
        setShown((current) =>
          current.kind === "drawer" ? { ...current, parts: answer.parts } : current,
        );
        setCartCount(answer.count);
      },
      () => undefined,
    );
  };

  return (
    <span
      data-slot="cart-island"
      className="contents"
      onClickCapture={shown.kind === "link" ? openDrawer : undefined}
      onSubmitCapture={change}
    >
      {shown.kind === "drawer" ? (
        <CartDrawerClient {...shown.parts} open={shown.open} onOpenChange={drawerOpenChange} />
      ) : shown.kind === "quick" ? (
        <QuickCartDropdownClient {...shown.parts} open onOpenChange={quickOpenChange} />
      ) : (
        <VisitorCartButton {...button} />
      )}
    </span>
  );
}
