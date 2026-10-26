import type { Messages } from "@shopblok/i18n";
import type { PromoCodeError } from "@shopblok/ui/molecules/promo-code-field";
import { CartTemplate, cartCopy, type CartError } from "@shopblok/ui/templates/cart";
import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import {
  applyPromoFromCart,
  removeLineFromCart,
  removePromoFromCart,
  updateLineFromCart,
} from "../../../../lib/actions/checkout";
import { MAX_LINE_QUANTITY } from "../../../../lib/actions/cart-handlers";
import { readCheckoutCart } from "../../../../lib/checkout-cart";
import { getCurrentMarket } from "../../../../lib/current-market";
import { readFlash, type Flash } from "../../../../lib/flash";
import { getMarketContext } from "../../../../lib/market-context";
import { SHELL_PREFETCH } from "../../../../lib/site";

// D65 (T52): the cart page. Dynamic and blocking (`instant = false`, no `Suspense`): the cart is
// the visitor's, read from the cookie (`readCheckoutCart`, `"use cache: private"`), and it is in
// the HTML, which a browser without scripts needs (a streamed hole is swapped in by a script).
// Every change is a form posting to a server action bound to the market, which redirects back
// here (`lib/actions/forms.ts`); a failure comes back as a flash under `?f=`. `noindex`.

export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.templates.cart.title, robots: { index: false, follow: false } };
}

function CartFallback({ messages }: { messages: Messages }) {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-8 md:px-6 md:py-12 lg:px-8"
    >
      <h1 className="text-2xl leading-tight font-semibold md:text-3xl">
        {messages.templates.cart.title}
      </h1>
    </main>
  );
}

const CART_ERRORS = new Set<CartError>(["not-found", "rejected", "unavailable", "invalid"]);

/** A failed change's words: a promotion code's beside its field, any other at the top. */
function errorsOf(flash: Flash | null): {
  error?: CartError;
  promoError?: PromoCodeError;
  promoCode: string;
} {
  if (flash === null) return { promoCode: "" };
  const code = flash.values?.code;
  if (code !== undefined)
    return {
      promoError: flash.form === "unavailable" ? "failed" : "invalid",
      promoCode: code,
    };
  if (flash.errors?.quantity !== undefined) return { error: "invalid", promoCode: "" };
  const form = flash.form as CartError | undefined;
  return { error: form !== undefined && CART_ERRORS.has(form) ? form : "rejected", promoCode: "" };
}

export default async function CartPage({ searchParams }: Props) {
  const [market, messages, params] = await Promise.all([
    getCurrentMarket(),
    getMessages(),
    searchParams,
  ]);
  const context = await getMarketContext(market.key);
  if (context === null) return <CartFallback messages={messages} />;
  const read = await readCheckoutCart(market.key);
  const cartHref = context.url("/cart");
  const key = typeof params.f === "string" ? params.f : undefined;
  const flash = await readFlash(cartHref, key);
  const { error, promoError, promoCode } = errorsOf(flash);
  const empty = {
    id: "none",
    currencyCode: context.region.currencyCode.toUpperCase(),
    lines: [],
    itemCount: 0,
    subtotal: { amount: 0, currencyCode: context.region.currencyCode.toUpperCase() },
    discountTotal: { amount: 0, currencyCode: context.region.currencyCode.toUpperCase() },
    total: { amount: 0, currencyCode: context.region.currencyCode.toUpperCase() },
    promoCodes: [],
  };
  return (
    <CartTemplate
      variant="default"
      cart={read?.view ?? empty}
      promoCode={promoCode}
      checkoutHref={context.url("/checkout")}
      continueHref={context.url("/store")}
      copy={cartCopy(messages)}
      locale={market.htmlLang}
      updateAction={updateLineFromCart.bind(null, market.key)}
      removeAction={removeLineFromCart.bind(null, market.key)}
      applyCodeAction={applyPromoFromCart.bind(null, market.key)}
      removeCodeAction={removePromoFromCart.bind(null, market.key)}
      {...(error === undefined ? {} : { error })}
      {...(promoError === undefined ? {} : { promoError })}
      maxQuantity={MAX_LINE_QUANTITY}
      prefetch={SHELL_PREFETCH}
    />
  );
}
