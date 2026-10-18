// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, D45, D49). CartDrawer's
// client part: the cart button and the sheet it opens from the reading end (the sheet primitive, Base
// UI's Dialog: modal, focus trapped, Escape closes and puts focus back on the button).
// A client component because the open sheet is state. It takes everything made, as FilterDrawerClient does
// (D49): the words the server formatted ("3 items") and the body and the summary as nodes the server
// rendered, so this file imports no formatter, no catalog and no contract.
// - The sheet is three boxes in a column: the header (the title, the count beside it and the close
//   button, first in the order, so focus starts on the close button), the body that scrolls between
//   the header and the foot, and the foot that stays in view with the summary, the note, "Checkout"
//   and "View cart". An empty cart has no foot: its body says so and links on. The body is
//   `relative`: the lines' absolutely positioned parts (visually hidden labels, the number field's
//   hidden input) would otherwise take the fixed sheet as their containing block and stretch it.
// - The links close the sheet: the page they open is another route of the same layout, where a sheet
//   left open would cover it.
// - The button is 44 px: the bag, and a badge with the count for the eye (hidden from assistive
//   technology); its name is "Cart" and the server's words after it ("Cart, 3 items"), as the
//   header's CartButton names itself.
// - The sheet is 90 % of the window up to 28 rem, wide enough for a line's picture beside its words.
//   Nothing slides under reduced motion. A sheet drawn open at first render (`defaultOpen`, the
//   design system's states) takes no focus until a reader opens it again.
"use client";

import { buttonVariants, Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@shopblok/ui/primitives/sheet";
import { ShoppingBagIcon, XIcon } from "lucide-react";
import NextLink from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";

type CartDrawerClientProps = {
  copy: {
    /** The button's name. */
    open: string;
    /** What the cart holds, after the name: "3 items". */
    items: string;
    title: string;
    /** Beside the title: "3 items". */
    count: string;
    close: string;
    note: string;
    checkout: string;
    viewCart: string;
  };
  /** The badge's digits; none for an empty cart. */
  badge?: string;
  /** The lines, the free-shipping bar and the promotion field, or the empty state. */
  body: ReactNode;
  /** The summary's rows; none for an empty cart, which has no foot. */
  summary?: ReactNode;
  cartHref: string;
  checkoutHref: string;
  prefetch?: boolean | null;
  defaultOpen?: boolean;
  modal?: boolean;
  triggerClassName?: string;
  popupClassName?: string;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; these are strings the
// app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** For a sheet given `defaultOpen`: no focus when it opens by itself, the first control's later. */
const takesFocusWhenOpenedByAReader = (interaction: string) => interaction !== "";

function CartDrawerClient({
  copy,
  badge,
  body,
  summary,
  cartHref,
  checkoutHref,
  prefetch,
  defaultOpen,
  modal,
  triggerClassName,
  popupClassName,
}: CartDrawerClientProps) {
  const [open, setOpen] = useState(defaultOpen === true);
  /** A link followed in this tab closes the drawer; one opened in a new tab leaves it. */
  const close = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setOpen(false);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen} modal={modal ?? true}>
      <SheetTrigger
        data-slot="cart-drawer-trigger"
        render={<Button variant="ghost" size="icon" className={cn("relative", triggerClassName)} />}
      >
        <Icon icon={ShoppingBagIcon} />
        <span className="sr-only">
          {copy.open}, {copy.items}
        </span>
        {badge === undefined ? null : (
          <span
            data-slot="cart-drawer-badge"
            aria-hidden="true"
            className="pointer-events-none absolute -end-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs leading-none font-semibold text-primary-foreground tabular-nums ring-2 ring-background"
          >
            {badge}
          </span>
        )}
      </SheetTrigger>
      <SheetContent
        side="inline-end"
        showCloseButton={false}
        data-slot="cart-drawer"
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        className={cn(
          "gap-0 motion-reduce:transition-none data-[side=inline-end]:w-[90%] data-[side=inline-end]:sm:max-w-md",
          popupClassName,
        )}
      >
        <div
          data-slot="cart-drawer-header"
          className="flex shrink-0 items-center justify-between gap-2 border-b py-2 ps-4 pe-2"
        >
          <SheetTitle className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-base wrap-anywhere">
            <span>{copy.title}</span>
            <span className="text-sm font-normal text-muted-foreground">{copy.count}</span>
          </SheetTitle>
          <SheetClose
            data-slot="cart-drawer-close"
            render={<Button variant="ghost" size="icon" className="shrink-0" />}
          >
            <Icon icon={XIcon} />
            <span className="sr-only">{copy.close}</span>
          </SheetClose>
        </div>
        <div
          data-slot="cart-drawer-body"
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
        >
          {body}
        </div>
        {summary === undefined ? null : (
          <div
            data-slot="cart-drawer-foot"
            className="flex shrink-0 flex-col gap-3 border-t bg-popover p-4"
          >
            {summary}
            <p className="text-sm text-muted-foreground wrap-break-word">{copy.note}</p>
            <div className="flex flex-wrap gap-2">
              <NextLink
                href={checkoutHref as LinkHref}
                prefetch={prefetch}
                data-slot="cart-drawer-checkout"
                onClick={close}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "max-w-full min-w-0 flex-[2] basis-40",
                )}
              >
                <span className="min-w-0 wrap-anywhere">{copy.checkout}</span>
              </NextLink>
              <NextLink
                href={cartHref as LinkHref}
                prefetch={prefetch}
                data-slot="cart-drawer-view"
                onClick={close}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "max-w-full min-w-0 flex-1 basis-32",
                )}
              >
                <span className="min-w-0 wrap-anywhere">{copy.viewCart}</span>
              </NextLink>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export { CartDrawerClient };
export type { CartDrawerClientProps };
