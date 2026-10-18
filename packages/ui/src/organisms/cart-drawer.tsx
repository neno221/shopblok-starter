// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, D42, D49; SBP
// cart-popup.md). The cart in a sheet from the reading end of the page: a 44 px cart button (the bag,
// a badge with the count for the eye, "Cart 3 items" for the ear) that opens a modal sheet titled
// "Your cart" with the count beside it, a close button, a body that scrolls (FreeShippingProgress,
// the lines as CartLineItems, every option shown, and PromoCodeField) and a foot that stays in view
// (the subtotal, the discount and the total as OrderSummaryRows in one `<dl>`, "Shipping and taxes
// are calculated at checkout.", "Checkout" as the primary 44 px link and "View cart"). An empty cart
// is EmptyState in the body ("Your cart is empty", "Continue shopping") and no foot. The lines and the
// promotion field are T34's molecules with their own forms (quantity, remove, apply, take off), each
// posting to the caller's action, so the drawer works as plain forms once open; M3 passes the
// server actions and the line in flight (`pendingLineId`). A server component on purpose (D49), as
// FilterDrawer is: it formats every word and renders the molecules, which are server components, and
// hands both to `CartDrawerClient`, which opens and closes; no catalog and no formatter is in a
// client chunk.
import type { Messages } from "@shopblok/i18n";
import { formatMessage, formatNumber } from "@shopblok/i18n/format";
import type { CartDrawer as CartDrawerContent } from "@shopblok/registry/contracts";
import { CartLineItem } from "@shopblok/ui/molecules/cart-line-item";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import { FreeShippingProgress } from "@shopblok/ui/molecules/free-shipping-progress";
import { OrderSummaryRow } from "@shopblok/ui/molecules/order-summary-row";
import {
  PromoCodeField,
  type PromoCodeError,
  type PromoCodePending,
} from "@shopblok/ui/molecules/promo-code-field";
import { ShoppingBagIcon } from "lucide-react";
import type * as React from "react";
import { CartDrawerClient } from "./cart-drawer-client";

type FormAction = React.ComponentProps<"form">["action"];

/** The most the badge writes out; more is "99+" (CartButton's rule). */
const BADGE_MAX = 99;

type CartDrawerProps = CartDrawerContent & {
  /** The wording: the drawer's own, and the molecules' it draws. */
  copy: {
    drawer: Messages["organisms"]["cartDrawer"];
    line: Messages["molecules"]["cartLineItem"];
    promo: Messages["molecules"]["promoCodeField"];
    freeShipping: Messages["molecules"]["freeShippingProgress"];
    rows: Messages["molecules"]["orderSummaryRow"];
  };
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** CartLineItem's actions: the quantity form's and the remove form's. */
  updateAction?: FormAction;
  removeAction?: FormAction;
  /** PromoCodeField's actions: applying a code, and taking one off. */
  applyCodeAction?: FormAction;
  removeCodeAction?: FormAction;
  /** The line being updated: it cannot be changed again until the cart answers. */
  pendingLineId?: string;
  promoError?: PromoCodeError;
  promoPending?: PromoCodePending;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** Drawn open at first render (the design system's states); takes no focus until opened again. */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  triggerClassName?: string;
  popupClassName?: string;
};

function CartDrawer({
  cart,
  promoCode,
  cartHref,
  checkoutHref,
  continueHref,
  copy,
  locale,
  updateAction,
  removeAction,
  applyCodeAction,
  removeCodeAction,
  pendingLineId,
  promoError,
  promoPending,
  prefetch,
  defaultOpen,
  modal,
  triggerClassName,
  popupClassName,
}: CartDrawerProps) {
  const words = copy.drawer;
  const count = cart.itemCount;
  const empty = cart.lines.length === 0;
  const badge =
    count === 0
      ? undefined
      : count > BADGE_MAX
        ? formatMessage(words.overflow, { max: formatNumber(BADGE_MAX, locale) }, locale)
        : formatNumber(count, locale);
  const discountDetail = cart.promoCodes.map((promo) => promo.code).join(", ");
  const body = empty ? (
    <EmptyState
      icon={ShoppingBagIcon}
      title={words.emptyTitle}
      text={words.emptyText}
      action={{ label: words.continue, href: continueHref }}
      headingLevel={3}
      prefetch={prefetch}
    />
  ) : (
    <div className="flex min-w-0 flex-col gap-6 py-4">
      {cart.freeShipping === undefined ? null : (
        <FreeShippingProgress
          freeShipping={cart.freeShipping}
          copy={copy.freeShipping}
          locale={locale}
        />
      )}
      <ul role="list" aria-label={words.lines} className="flex min-w-0 flex-col divide-y">
        {cart.lines.map((line) => (
          <li key={line.id} className="py-4 first:pt-0">
            <CartLineItem
              line={line}
              copy={copy.line}
              locale={locale}
              updateAction={updateAction}
              removeAction={removeAction}
              pending={pendingLineId === line.id}
              prefetch={prefetch}
            />
          </li>
        ))}
      </ul>
      <PromoCodeField
        entry={{ applied: cart.promoCodes, code: promoCode }}
        copy={copy.promo}
        locale={locale}
        applyAction={applyCodeAction}
        removeAction={removeCodeAction}
        error={promoError}
        pending={promoPending}
      />
    </div>
  );
  const summary = empty ? undefined : (
    <dl aria-label={words.summary} data-slot="cart-drawer-summary" className="flex flex-col">
      <OrderSummaryRow kind="subtotal" amount={cart.subtotal} copy={copy.rows} locale={locale} />
      {cart.discountTotal.amount > 0 ? (
        <OrderSummaryRow
          kind="discount"
          amount={cart.discountTotal}
          {...(discountDetail === "" ? {} : { detail: discountDetail })}
          copy={copy.rows}
          locale={locale}
        />
      ) : null}
      <OrderSummaryRow kind="total" amount={cart.total} copy={copy.rows} locale={locale} />
    </dl>
  );
  return (
    <CartDrawerClient
      copy={{
        open: words.open,
        items: formatMessage(words.items, { count }, locale),
        title: words.title,
        count: formatMessage(words.count, { count }, locale),
        close: words.close,
        note: words.note,
        checkout: words.checkout,
        viewCart: words.viewCart,
      }}
      badge={badge}
      body={body}
      summary={summary}
      cartHref={cartHref}
      checkoutHref={checkoutHref}
      prefetch={prefetch}
      defaultOpen={defaultOpen}
      modal={modal}
      triggerClassName={triggerClassName}
      popupClassName={popupClassName}
    />
  );
}

export { CartDrawer };
export type { CartDrawerProps };
