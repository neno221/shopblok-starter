// Ours (T85, SETUP.md "Cart variants (T85)"; D99, M5 plan §1a). What the cart page's members share,
// moved from `default.tsx` (T52's page) with no change to its pixels: the page's frame (its one
// `<h1>` with the count, the alert of a failed change, the empty state), the bar to free shipping,
// the lines as CartLineItems, the summary (PromoCodeField, the rows in one `<dl>`, the note, the way
// to the checkout and "Continue shopping") and the checkout link. Every form posts to the caller's
// actions, so each member works before any script runs. Server components.
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

/**
 * The page's frame: the root with its `data-variant` (the member it is, D99), the `<h1>` with the
 * count, the alert of a failed change, and then the member's lines and summary (`children`), or the
 * empty state for an empty cart. `top` comes between the alert and the rest when the cart has lines.
 */
function CartFrame({
  props,
  variant,
  top,
  className,
  children,
}: {
  props: CartTemplateProps;
  variant: NonNullable<CartPage["variant"]>;
  top?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const {
    cart,
    continueHref,
    copy,
    locale,
    error,
    maxQuantity = 99,
    prefetch,
    mainId = "main",
    as: Root = "main",
  } = props;
  const ids = cartIds(mainId);
  const words = copy.page;
  const empty = cart.lines.length === 0;
  return (
    <Root
      id={mainId}
      data-slot="cart-template"
      data-variant={variant}
      className={cn(
        "mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-8 md:px-6 md:py-12 lg:px-8",
        className,
        props.className,
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
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm leading-snug text-foreground"
        >
          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
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
        <>
          {top}
          {children}
        </>
      )}
    </Root>
  );
}

/** The bar to free shipping, when the cart's region has a threshold. */
function CartFreeShipping({ props }: { props: CartTemplateProps }) {
  const { cart, copy, locale } = props;
  return cart.freeShipping === undefined ? null : (
    <FreeShippingProgress freeShipping={cart.freeShipping} copy={copy.freeShipping} locale={locale} />
  );
}

/** The lines, each a CartLineItem with its quantity and remove forms, its title an `<h2>`. */
function CartLines({ props, className }: { props: CartTemplateProps; className?: string }) {
  const { cart, copy, locale, updateAction, removeAction, prefetch } = props;
  return (
    <ul
      role="list"
      aria-label={copy.page.lines}
      data-slot="cart-lines"
      className={cn("flex min-w-0 flex-col divide-y border-y", className)}
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
  );
}

/** The way to the checkout, the primary 44 px link, full width. */
function CartCheckoutLink({
  props,
  slot = "cart-checkout",
}: {
  props: CartTemplateProps;
  /** `cart-checkout-top` for the second one the focused member draws over a long cart. */
  slot?: string;
}) {
  return (
    <NextLink
      href={props.checkoutHref as LinkHref}
      prefetch={props.prefetch}
      data-slot={slot}
      className={cn(buttonVariants({ size: "lg" }), "w-full max-w-full")}
    >
      {props.copy.page.checkout}
    </NextLink>
  );
}

/**
 * The summary, a section named by its `<h2>`: `top` first (the sticky member's bar to free
 * shipping), the promotion codes, the rows in one `<dl>`, the note, the way to the checkout and
 * "Continue shopping".
 */
function CartSummary({
  props,
  top,
  className,
}: {
  props: CartTemplateProps;
  top?: React.ReactNode;
  className?: string;
}) {
  const {
    cart,
    promoCode,
    continueHref,
    copy,
    locale,
    applyCodeAction,
    removeCodeAction,
    promoError,
    prefetch,
    mainId = "main",
  } = props;
  const ids = cartIds(mainId);
  const words = copy.page;
  const discountDetail = cart.promoCodes.map((promo) => promo.code).join(", ");
  return (
    <section
      data-slot="cart-summary"
      aria-labelledby={ids.summary}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <h2 id={ids.summary} className="text-base leading-snug font-semibold">
        {words.summary}
      </h2>
      {top}
      <PromoCodeField
        entry={{ applied: cart.promoCodes, code: promoCode }}
        copy={copy.promo}
        locale={locale}
        applyAction={applyCodeAction}
        removeAction={removeCodeAction}
        error={promoError}
      />
      <dl data-slot="cart-summary-rows" className="flex flex-col border-t pt-2">
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
      <p className="text-sm leading-snug text-muted-foreground">{words.note}</p>
      <CartCheckoutLink props={props} />
      <NextLink
        href={continueHref as LinkHref}
        prefetch={prefetch}
        data-slot="cart-continue"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full max-w-full")}
      >
        {words.continue}
      </NextLink>
    </section>
  );
}

export {
  CartCheckoutLink,
  CartFrame,
  CartFreeShipping,
  CartLines,
  CartSummary,
  cartCopy,
  cartIds,
};
export type { CartCopy, CartError, CartTemplateProps };
