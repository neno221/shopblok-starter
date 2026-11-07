// Ours (T85, SETUP.md "Cart variants (T85)"; M5 plan §1a, D99). The cart page's `focused` member: one
// narrow column at every width, the summary after the lines, and the way to the checkout full
// width; a cart of more than three lines has that way at the top too, under the heading, so a
// shopper ready to pay need not scroll past every line. The same forms as the default member's.
// A server component.
import {
  CartCheckoutLink,
  CartFrame,
  CartFreeShipping,
  CartLines,
  CartSummary,
  type CartTemplateProps,
} from "./parts";

/** More lines than this put the way to the checkout at the top as well (M5 plan §1a). */
const TOP_CHECKOUT_AFTER = 3;

function CartFocused(props: CartTemplateProps) {
  const long = props.cart.lines.length > TOP_CHECKOUT_AFTER;
  return (
    <CartFrame
      props={props}
      variant="focused"
      className="max-w-2xl"
      top={long ? <CartCheckoutLink props={props} slot="cart-checkout-top" /> : null}
    >
      <CartFreeShipping props={props} />
      <CartLines props={props} />
      <CartSummary props={props} />
    </CartFrame>
  );
}

export { CartFocused, TOP_CHECKOUT_AFTER };
