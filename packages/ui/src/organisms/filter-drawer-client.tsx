// Ours (T37, SETUP.md "Listing organisms (T37)"; SPEC §8.4, D45, D49). FilterDrawer's client part:
// the button and the sheet it opens from the start side, on the sheet primitive (Base UI's Dialog:
// modal, focus trapped, Escape closes). A client component because the open sheet is state. It takes
// everything made, as MobileNavDrawerClient does (D49): the words the server formatted ("2 filters
// chosen", "Show 24 results"), and the groups as a node the server rendered, so this file imports no
// formatter, no catalog and no contract (a test reads its imports).
// - The sheet is three boxes in a column: the header (the title and the close button, in the flow
//   and first in the order, so focus starts on the close button), the body that scrolls between the
//   header and the foot, and the foot that stays in view with "Clear all" (a link to the listing
//   without any filter, drawn only when filters are chosen) and the submit "Show N results". The
//   form wraps the body and the foot, so the submit is the form's and its groups are its fields.
// - A link closes the sheet: "Clear all" goes to the same listing, so the page behind updates in
//   place and the sheet would stay open over the new results. The submit does not need to: it loads
//   a new page.
// - "Show N results" stays pressable when N is 0. The count is the listing's as the page was drawn,
//   not live as boxes are ticked, so a 0 can be the count of the filters already applied; a disabled
//   submit there would leave the visitor unable to apply the change that fixes it.
// - The body is a containing block for what is fixed inside it (`contain: paint`). Base UI draws the
//   price slider's two thumbs' hidden inputs as `position: fixed` boxes of one pixel, left where
//   they would have been in the flow; a fixed box belongs to the nearest containing block above it
//   (the viewport, or the design system's overflow box, which has `contain: paint` too), not to
//   the scroller, so the scroller did not clip them and the box saw a sheet with 700 px of content
//   below its edge (the design system's clip check found it). Contained, they scroll and clip with
//   the body, as everything else in it does.
// - The button is 44 px and says how many filters are chosen: the number in a badge for the eye
//   (hidden from assistive technology), and the server's sentence after the name for the ear, so the
//   name is "Filters, 2 filters chosen" and contains the visible "Filters" (WCAG 2.5.3).
// - The sheet is wider than the navigation's (90 % of the window up to 28 rem): a swatch group and a
//   price slider need the room. Nothing slides under reduced motion. A sheet drawn open at first
//   render (`defaultOpen`, the design system's states) takes no focus until a reader opens it again,
//   because several open states on one page would take it from each other.
"use client";

import { Badge } from "@shopblok/ui/atoms/badge";
import { buttonVariants, Button } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@shopblok/ui/primitives/sheet";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import NextLink from "next/link";
import { useState, type ReactNode } from "react";

type FilterDrawerClientProps = {
  /** The listing the form GETs. */
  action: string;
  copy: {
    /** The button's name. */
    open: string;
    /** The sheet's title. */
    title: string;
    close: string;
    /** The submit: "Show 24 results". */
    show: string;
    /** The link that drops every filter. */
    clear: string;
  };
  /** How many filters are chosen, as the server formatted it; none: nothing is chosen. */
  chosen?: { badge: string; text: string };
  /** The way to drop every filter; drawn only when filters are chosen. */
  clearHref?: string;
  /** The form's fields, rendered by the server (FilterFields). */
  fields: ReactNode;
  prefetch?: boolean | null;
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states). */
  modal?: boolean;
  triggerClassName?: string;
  popupClassName?: string;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; this one is a string
// the app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function FilterDrawerClient({
  action,
  copy,
  chosen,
  clearHref,
  fields,
  prefetch,
  defaultOpen,
  modal,
  triggerClassName,
  popupClassName,
}: FilterDrawerClientProps) {
  const [open, setOpen] = useState(defaultOpen === true);
  return (
    <Sheet open={open} onOpenChange={setOpen} modal={modal ?? true}>
      <SheetTrigger
        data-slot="filter-drawer-trigger"
        render={<Button variant="outline" className={cn("max-w-full", triggerClassName)} />}
      >
        <Icon icon={SlidersHorizontalIcon} />
        {/* One box for the name and the sentence after it, so the name reads "Filters, 2 filters chosen". */}
        <span className="min-w-0 wrap-anywhere">
          {copy.open}
          {chosen === undefined ? null : <span className="sr-only">, {chosen.text}</span>}
        </span>
        {chosen === undefined ? null : (
          <Badge
            variant="secondary"
            data-slot="filter-drawer-count"
            aria-hidden="true"
            className="min-w-5"
          >
            {chosen.badge}
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent
        side="inline-start"
        showCloseButton={false}
        data-slot="filter-drawer"
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        className={cn(
          "gap-0 motion-reduce:transition-none data-[side=inline-start]:w-[90%] data-[side=inline-start]:sm:max-w-md",
          popupClassName,
        )}
      >
        <div
          data-slot="filter-drawer-header"
          className="flex shrink-0 items-center justify-between gap-2 border-b py-2 ps-4 pe-2"
        >
          <SheetTitle className="min-w-0 text-base wrap-anywhere">{copy.title}</SheetTitle>
          <SheetClose
            data-slot="filter-drawer-close"
            render={<Button variant="ghost" size="icon" className="shrink-0" />}
          >
            <Icon icon={XIcon} />
            <span className="sr-only">{copy.close}</span>
          </SheetClose>
        </div>
        <form action={action} method="get" className="flex min-h-0 flex-1 flex-col">
          <div
            data-slot="filter-drawer-body"
            className="min-h-0 flex-1 [contain:paint] overflow-y-auto overscroll-contain px-4"
          >
            {fields}
          </div>
          <div
            data-slot="filter-drawer-foot"
            className="flex shrink-0 flex-wrap gap-2 border-t bg-popover p-4"
          >
            {clearHref === undefined ? null : (
              <NextLink
                href={clearHref as LinkHref}
                prefetch={prefetch}
                data-slot="filter-drawer-clear"
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "max-w-full min-w-0 flex-1 basis-32",
                )}
              >
                <span className="min-w-0 wrap-anywhere">{copy.clear}</span>
              </NextLink>
            )}
            <Button
              type="submit"
              data-slot="filter-drawer-submit"
              className="max-w-full min-w-0 flex-[2] basis-40"
            >
              <span className="min-w-0 wrap-anywhere">{copy.show}</span>
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export { FilterDrawerClient };
export type { FilterDrawerClientProps };
