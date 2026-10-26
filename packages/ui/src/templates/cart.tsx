// Ours (T52, SETUP.md "Cart and checkout (T52)"; D65, SBP layouts/cart.md, features/promotions.md).
// The cart page's `<main>`: its one `<h1>` ("Your cart", the count beside it), the lines as
// CartLineItems (every option shown, each line's quantity and remove forms), and the summary beside
// them from `lg` (below them on a phone): the promotion codes (PromoCodeField), the subtotal, the
// discount and the total as OrderSummaryRows in one `<dl>`, "Shipping and taxes are calculated at
// checkout.", the way to the checkout as the primary 44 px link, and "Continue shopping". The forms
// post to the caller's actions (the shop's server actions, which redirect back here), so the page
// works before any script runs; an action's failure comes back as `error` and is said at the top,
// in an alert. An empty cart is EmptyState with the way back to the shop. A server component.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { CartPage } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { CartLineItem } from "@shopblok/ui/molecules/cart-line-item";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import { FreeShippingProgress } from "@shopblok/ui/molecules/free-shipping-progress";
import { OrderSummaryRow } from "@shopblok/ui/molecules/order-summary-row";
import { PromoCodeField, type PromoCodeError } from "@shopblok/ui/molecules/promo-code-field";
import { CircleAlertIcon, ShoppingBagIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type FormAction = React.ComponentProps<"form">["action"];

type CartCopy = {
  page: Messages["templates"]["cart"];
  line: Messages["molecules"]["cartLineItem"];
  promo: Messages["molecules"]["promoCodeField"];
  freeShipping: Messages["molecules"]["freeShippingProgress"];
  rows: Messages["molecules"]["orderSummaryRow"];
};

/** The cart page's words from a whole catalog: its own and its molecules'. */
function cartCopy(messages: Messages): CartCopy {
  const { molecules, templates } = messages;
  return {
    page: templates.cart,
    line: molecules.cartLineItem,
    promo: molecules.promoCodeField,
    freeShipping: molecules.freeShippingProgress,
    rows: molecules.orderSummaryRow,
  };
}

/** Why the last change failed, when no promotion code is to blame: each is under `errors`. */
type CartError = keyof Messages["templates"]["cart"]["errors"];

/** The ids the parts' headings name them by, from the root's id. */
function cartIds(mainId: string) {
  return { title: `${mainId}-title`, summary: `${mainId}-summary-title` };
}

type CartTemplateProps = CartPage & {
  copy: CartCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** CartLineItem's actions: the quantity form's (`lineId`, `quantity`) and the remove form's. */
  updateAction?: FormAction;
  removeAction?: FormAction;
  /** PromoCodeField's actions: applying a code, and taking one off (`code`). */
  applyCodeAction?: FormAction;
  removeCodeAction?: FormAction;
  /** Why the last change failed. */
  error?: CartError;
  /** The most a line may hold, for the `invalid` error's words. */
  maxQuantity?: number;
  promoError?: PromoCodeError;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

function CartTemplate({
  cart,
  promoCode,
  checkoutHref,
  continueHref,
  copy,
  locale,
  updateAction,
  removeAction,
  applyCodeAction,
  removeCodeAction,
  error,
  maxQuantity = 99,
  promoError,
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: CartTemplateProps) {
  const ids = cartIds(mainId);
  const words = copy.page;
  const empty = cart.lines.length === 0;
  const discountDetail = cart.promoCodes.map((promo) => promo.code).join(", ");
  return (
    <Root
      id={mainId}
      data-slot="cart-template"
      data-variant="default"
      className={cn(
        "mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-8 md:px-6 md:py-12 lg:px-8",
        className,
      )}
    >
      <h1
        id={ids.title}
        className="flex flex-wrap items-baseline gap-x-3 text-2xl leading-tight font-semibold wrap-anywhere md:text-3xl"
      >
        <span>{words.title}</span>
        {empty ? null : (
          <span data-slot="cart-count" className="text-base font-normal text-muted-foreground">
            {formatMessage(words.count, { count: cart.itemCount }, locale)}
          </span>
        )}
      </h1>
      {error === undefined ? null : (
        <p
          role="alert"
          data-slot="cart-error"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm leading-snug text-destructive"
        >
          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 wrap-break-word">
            {formatMessage(words.errors[error], { max: maxQuantity }, locale)}
          </span>
        </p>
      )}
      {empty ? (
        <EmptyState
          icon={ShoppingBagIcon}
          title={words.empty.title}
          text={words.empty.text}
          action={{ label: words.continue, href: continueHref }}
          prefetch={prefetch}
        />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-x-10">
          <div className="flex min-w-0 flex-col gap-6">
            {cart.freeShipping === undefined ? null : (
              <FreeShippingProgress
                freeShipping={cart.freeShipping}
                copy={copy.freeShipping}
                locale={locale}
              />
            )}
            <ul
              role="list"
              aria-label={words.lines}
              data-slot="cart-lines"
              className="flex min-w-0 flex-col divide-y border-y"
            >
              {cart.lines.map((line) => (
                <li key={line.id} className="py-4">
                  <CartLineItem
                    line={line}
                    copy={copy.line}
                    locale={locale}
                    updateAction={updateAction}
                    removeAction={removeAction}
                    heading="h2"
                    prefetch={prefetch}
                  />
                </li>
              ))}
            </ul>
          </div>
          <section
            data-slot="cart-summary"
            aria-labelledby={ids.summary}
            className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground lg:sticky lg:top-4"
          >
            <h2 id={ids.summary} className="text-base leading-snug font-semibold">
              {words.summary}
            </h2>
            <PromoCodeField
              entry={{ applied: cart.promoCodes, code: promoCode }}
              copy={copy.promo}
              locale={locale}
              applyAction={applyCodeAction}
              removeAction={removeCodeAction}
              error={promoError}
            />
            <dl data-slot="cart-summary-rows" className="flex flex-col border-t pt-2">
              <OrderSummaryRow
                kind="subtotal"
                amount={cart.subtotal}
                copy={copy.rows}
                locale={locale}
              />
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
            <p className="text-sm leading-snug text-muted-foreground">{words.note}</p>
            <NextLink
              href={checkoutHref as LinkHref}
              prefetch={prefetch}
              data-slot="cart-checkout"
              className={cn(buttonVariants({ size: "lg" }), "w-full max-w-full")}
            >
              {words.checkout}
            </NextLink>
            <NextLink
              href={continueHref as LinkHref}
              prefetch={prefetch}
              data-slot="cart-continue"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full max-w-full",
              )}
            >
              {words.continue}
            </NextLink>
          </section>
        </div>
      )}
    </Root>
  );
}

export { CartTemplate, cartCopy, cartIds };
export type { CartCopy, CartError, CartTemplateProps };
