// Ours (T52, SETUP.md "Cart and checkout (T52)"; D65, SBP layouts/cart.md, features/promotions.md).
// The cart page's `<main>`: its one `<h1>` ("Your cart", the count beside it), the lines as
// CartLineItems (every option shown, each line's quantity and remove forms), and the summary beside
// them from `lg` (below them on a phone): the promotion codes (PromoCodeField), the subtotal, the
// discount and the total as OrderSummaryRows in one `<dl>`, "Shipping and taxes are calculated at
// checkout.", the way to the checkout as the primary 44 px link, and "Continue shopping". The forms
// post to the caller's actions (the shop's server actions, which redirect back here), so the page
// works before any script runs; an action's failure comes back as `error` and is said at the top,
// in an alert. An empty cart is EmptyState with the way back to the shop. A server component.
// T85: the `cart` family's first member; its parts are in `./parts.tsx`, shared with the others.
import {
  CartFrame,
  CartFreeShipping,
  CartLines,
  CartSummary,
  cartCopy,
  cartIds,
  type CartCopy,
  type CartError,
  type CartTemplateProps,
} from "./parts";

function CartDefault(props: CartTemplateProps) {
  return (
    <CartFrame props={props} variant="default">
      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-x-10">
        <div className="flex min-w-0 flex-col gap-6">
          <CartFreeShipping props={props} />
          <CartLines props={props} />
        </div>
        <CartSummary props={props} className="lg:sticky lg:top-4" />
      </div>
    </CartFrame>
  );
}

export { CartDefault, cartCopy, cartIds };
export type { CartCopy, CartError, CartTemplateProps };
