// Ours (T85, SETUP.md "Cart variants (T85)"; M5 plan §1a, D99). The cart page's `sticky-summary`
// member: the summary sits beside the lines from `md` (the default waits for `lg`) and sticks there
// while they scroll, clear of a sticky header, scrolling inside itself when it is taller than the
// window; it opens with the bar to free shipping, so what is left to spend stays in sight beside
// the lines. Below `md` the summary follows the lines. The same forms as the default member's.
// A server component.
import { CartFrame, CartFreeShipping, CartLines, CartSummary, type CartTemplateProps } from "./parts";

function CartStickySummary(props: CartTemplateProps) {
  return (
    <CartFrame props={props} variant="sticky-summary">
      <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] md:items-start md:gap-x-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-x-10">
        <CartLines props={props} />
        <CartSummary
          props={props}
          top={<CartFreeShipping props={props} />}
          className="md:sticky md:top-24 md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto md:overscroll-contain"
        />
      </div>
    </CartFrame>
  );
}

export { CartStickySummary };
