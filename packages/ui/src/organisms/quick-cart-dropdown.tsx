// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, D49; SBP
// cart-popup.md, "Dropdown"). What the header's cart button shows after a product is added: a popover
// under the button, titled "Added to your cart" with a check, holding the line just added as the cart
// now has it (the picture, the title, every chosen option, the quantity and the line's total), the
// cart's subtotal with its count ("Subtotal (4 items)") and the two ways on, "Checkout" (primary) and
// "View cart", both 44 px links. No quantity or remove controls: they are the drawer's and the cart
// page's, and a dropdown that changes the cart would need to answer for it. The button is the cart
// button's look (the bag, the badge, "Cart, 4 items"). A server component on purpose (D49): it formats
// every word and renders the line, and hands both to `QuickCartDropdownClient`, which opens, closes
// and says "Added to your cart: …" once in a polite region.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { QuickCart } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { Price } from "@shopblok/ui/atoms/price";
import { cartBadgeText } from "@shopblok/ui/lib/cart-badge";
import { ImageOffIcon } from "lucide-react";
import { QuickCartDropdownClient } from "./quick-cart-dropdown-client";

type QuickCartDropdownProps = QuickCart & {
  /** The wording, from the catalog's `organisms.quickCartDropdown`. */
  copy: Messages["organisms"]["quickCartDropdown"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch` for the two links; the design system passes `false`. */
  prefetch?: boolean | null;
  /** Drawn open at first render (after an add, or the design system's states). */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  triggerClassName?: string;
  popupClassName?: string;
};

function QuickCartDropdown({
  added,
  itemCount,
  subtotal,
  cartHref,
  checkoutHref,
  copy,
  locale,
  prefetch,
  defaultOpen,
  modal,
  triggerClassName,
  popupClassName,
}: QuickCartDropdownProps) {
  const badge = cartBadgeText(itemCount, locale, copy.overflow);
  const { image } = added;
  const line = (
    <div data-slot="quick-cart-line" className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3">
      <div className="w-16">
        {image === undefined ? (
          <div
            aria-hidden="true"
            className="flex aspect-[4/5] w-full items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <ImageOffIcon className="size-5" />
          </div>
        ) : (
          <Image src={image.src} alt="" sizes="64px" ratio="portrait" radius="md" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 text-sm leading-snug">
        <p data-slot="quick-cart-title" className="font-medium wrap-anywhere">
          {added.title}
        </p>
        {added.options.map((option, index) => (
          <p key={`${option.option}-${index}`} className="text-muted-foreground wrap-anywhere">
            {formatMessage(copy.option, option, locale)}
          </p>
        ))}
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-muted-foreground">
          <span>{formatMessage(copy.quantity, { count: added.quantity }, locale)}</span>
          <Price
            size="sm"
            amount={added.total.amount}
            currency={added.total.currencyCode}
            locale={locale}
            className="text-foreground"
          />
        </p>
      </div>
    </div>
  );
  const subtotalRow = (
    <p
      data-slot="quick-cart-subtotal"
      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-3 text-sm font-medium"
    >
      <span className="min-w-0 wrap-anywhere">
        {formatMessage(copy.subtotal, { count: itemCount }, locale)}
      </span>
      <Price amount={subtotal.amount} currency={subtotal.currencyCode} locale={locale} />
    </p>
  );
  return (
    <QuickCartDropdownClient
      copy={{
        open: copy.open,
        items: formatMessage(copy.items, { count: itemCount }, locale),
        title: copy.title,
        close: copy.close,
        viewCart: copy.viewCart,
        checkout: copy.checkout,
        announce: formatMessage(copy.announce, { title: added.title }, locale),
      }}
      badge={badge}
      line={line}
      subtotal={subtotalRow}
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

export { QuickCartDropdown };
export type { QuickCartDropdownProps };
