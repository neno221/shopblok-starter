// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, D45, D49).
// QuickCartDropdown's client part: the cart button and the popover under it (the popover primitive,
// Base UI's Popover, with focus trapped while it is open, as MarketSwitcher's is: Escape or the close
// button closes it and focus goes back to the button). A client component because the open popover
// is state. It takes everything made (D49): the words the server formatted and the line and the subtotal
// as nodes the server rendered, so this file imports no formatter, no catalog and no contract.
// - "Added to your cart: Merino Ankle Socks" is said once, politely, each time the popover opens: the
//   region is in the page from the first render and empty, and the words arrive when it opens (by the
//   button, or by `open` from M3's island after an add). A popover drawn open at first render (the
//   design system's states) says nothing and takes no focus until a reader opens it again.
// - The links close the popover: they open another route of the same layout.
// - The popup is as wide as 22 rem and never wider than the window allows (`--available-width`), and
//   scrolls inside itself when the window is short (`--available-height`); it is aligned to the
//   button's end, under the header's right-hand corner.
"use client";

import { buttonVariants, Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { cartBadgeClassName } from "@shopblok/ui/lib/cart-badge";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@shopblok/ui/primitives/popover";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CircleCheckIcon, ShoppingBagIcon, XIcon } from "lucide-react";
import NextLink from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";

type QuickCartDropdownClientProps = {
  copy: {
    open: string;
    /** What the cart holds, after the button's name: "4 items". */
    items: string;
    title: string;
    close: string;
    viewCart: string;
    checkout: string;
    /** Said when the popover opens: "Added to your cart: Merino Ankle Socks". */
    announce: string;
  };
  badge: string;
  /** The line just added, rendered by the server. */
  line: ReactNode;
  /** The cart's subtotal and count, rendered by the server. */
  subtotal: ReactNode;
  cartHref: string;
  checkoutHref: string;
  prefetch?: boolean | null;
  /** Open at first render. */
  defaultOpen?: boolean;
  /** Controlled: M3's island opens it after an add. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  triggerClassName?: string;
  popupClassName?: string;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; these are strings the
// app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function QuickCartDropdownClient({
  copy,
  badge,
  line,
  subtotal,
  cartHref,
  checkoutHref,
  prefetch,
  defaultOpen,
  open: openProp,
  onOpenChange,
  modal,
  triggerClassName,
  popupClassName,
}: QuickCartDropdownClientProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen === true);
  const open = openProp ?? ownOpen;
  // What the region says: nothing at first, and the sentence when the page opens the popover after
  // an add. Opened from its own button, it says nothing: no add happened then.
  const [said, setSaid] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const [byButton, setByButton] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    setSaid(open && !byButton ? copy.announce : "");
    if (!open) setByButton(false);
  }
  const change = (next: boolean) => {
    setByButton(next);
    setOwnOpen(next);
    onOpenChange?.(next);
  };
  /** A link followed in this tab closes the popover; one opened in a new tab leaves it. */
  const closeOnPlainClick = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    change(false);
  };
  return (
    <>
      <Popover open={open} onOpenChange={change} modal={modal === false ? false : "trap-focus"}>
        <PopoverTrigger
          data-slot="quick-cart-trigger"
          render={
            <Button variant="ghost" size="icon" className={cn("relative", triggerClassName)} />
          }
        >
          <Icon icon={ShoppingBagIcon} />
          <span className="sr-only">
            {copy.open}, {copy.items}
          </span>
          <span
            data-slot="quick-cart-badge"
            aria-hidden="true"
            className={cartBadgeClassName}
          >
            {badge}
          </span>
        </PopoverTrigger>
        <PopoverContent
          data-slot="quick-cart"
          initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
          align="end"
          className={cn(
            "w-[min(22rem,calc(100vw-2rem))] max-w-(--available-width) gap-3 overflow-y-auto motion-reduce:duration-0",
            "max-h-(--available-height)",
            popupClassName,
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <PopoverTitle className="flex min-w-0 items-center gap-2 pt-2.5 text-base leading-snug wrap-anywhere">
              <Icon icon={CircleCheckIcon} className="text-success" />
              <span>{copy.title}</span>
            </PopoverTitle>
            <PopoverPrimitive.Close
              data-slot="quick-cart-close"
              aria-label={copy.close}
              render={<Button variant="ghost" size="icon" className="-me-2 -mt-1 shrink-0" />}
            >
              <XIcon aria-hidden="true" />
            </PopoverPrimitive.Close>
          </div>
          {line}
          {subtotal}
          <div className="flex flex-col gap-2">
            <NextLink
              href={checkoutHref as LinkHref}
              prefetch={prefetch}
              data-slot="quick-cart-checkout"
              onClick={closeOnPlainClick}
              className={cn(buttonVariants(), "w-full")}
            >
              <span className="min-w-0 wrap-anywhere">{copy.checkout}</span>
            </NextLink>
            <NextLink
              href={cartHref as LinkHref}
              prefetch={prefetch}
              data-slot="quick-cart-view"
              onClick={closeOnPlainClick}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              <span className="min-w-0 wrap-anywhere">{copy.viewCart}</span>
            </NextLink>
          </div>
        </PopoverContent>
      </Popover>
      {/* There from the first render, empty, so a screen reader knows the region before it speaks. */}
      <span data-slot="quick-cart-status" role="status" aria-live="polite" className="sr-only">
        {said}
      </span>
    </>
  );
}

export { QuickCartDropdownClient };
export type { QuickCartDropdownClientProps };
