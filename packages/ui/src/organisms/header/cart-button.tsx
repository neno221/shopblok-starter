// Ours (T35, SETUP.md "Navigation and headers (T35)"; D44). The header's cart: a 44 px link to the
// cart page with a bag icon and a badge with the number of items. The number is the visitor's, so
// the button takes it as `count`, and without it draws a placeholder that looks the same as a cart
// the page knows nothing about: the bag alone, and a link named "Cart". The badge sits on the icon's
// corner, out of the flow, so the button keeps its size when the number arrives and nothing beside
// it moves. A prerendered page never knows the number (ADR 0004): the storefront's island
// (`apps/storefront/src/lib/visitor/`) renders this button in the browser with the store's value.
// The words for the number ("3 items") are in the link, so its name says them ("Cart 3 items"); the
// badge's digits are hidden from assistive technology, which hears the words. A change is read out by
// a polite live region beside the link ("Cart 4 items"), which has words only when `announce` says
// so: the island sets it once the number changes after the first one it knew, so a page load says
// nothing (PR 57 review). Neither a server nor a client component: it has no
// hook, so the header renders it on the server without a number and the island in the browser with
// one. It formats with `@shopblok/i18n/format`, which leaves the four catalogs out of the island's
// chunk.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { cartBadgeText } from "@shopblok/ui/lib/cart-badge";
import { cartBadgeClassName } from "@shopblok/ui/lib/cart-badge-class";
import { cn } from "@shopblok/ui/lib/utils";
import { ShoppingBagIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

type CartButtonProps = {
  /** The cart page. */
  href: string;
  /**
   * The number of items in the cart, once the browser knows it. Without it the button is the
   * placeholder a prerendered page draws (D44): no badge and no number in the link's name.
   */
  count?: number;
  /** The wording, from the catalog's `organisms.header`. */
  copy: Pick<Messages["organisms"]["header"], "cart" | "cartItems" | "cartOverflow">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`, for the plural and the digits. */
  locale: string;
  /**
   * The link's `prefetch` (next/link). Unset, Next prefetches the cart when the link comes into
   * view; the design system passes `false` because the page does not exist before M3.
   */
  prefetch?: boolean | null;
  /**
   * The number has changed since the page first knew it: the live region beside the link says the
   * new one. Unset, the region stays empty, so a page that has just loaded announces nothing.
   */
  announce?: boolean;
  className?: string;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; the cart's is a string
// the app built (the same cast as AddressCard's edit link).
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function CartButton({ href, count, copy, locale, prefetch, announce, className }: CartButtonProps) {
  const known = count !== undefined && Number.isInteger(count) && count >= 0;
  const badge = cartBadgeText(count, locale, copy.cartOverflow);
  const words = known ? formatMessage(copy.cartItems, { count }, locale) : undefined;
  return (
    <>
      <NextLink
        data-slot="cart-button"
        href={href as LinkHref}
        prefetch={prefetch}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative", className)}
      >
        <Icon icon={ShoppingBagIcon} />
        <span className="sr-only">{copy.cart}</span>
        {words === undefined ? null : <span className="sr-only"> {words}</span>}
        {badge === undefined ? null : (
          <span
            data-slot="cart-badge"
            aria-hidden="true"
            className={cartBadgeClassName}
          >
            {badge}
          </span>
        )}
      </NextLink>
      {/* There from the first render, empty, so a screen reader knows the region before it speaks. */}
      <span data-slot="cart-count" aria-live="polite" aria-atomic="true" className="sr-only">
        {announce === true && words !== undefined ? `${copy.cart} ${words}` : null}
      </span>
    </>
  );
}

export { CartButton };
export type { CartButtonProps };
