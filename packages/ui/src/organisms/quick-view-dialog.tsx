// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D41, D45, D49). A product's picture
// and buy box in a dialog, opened from a card, so a shopper can choose and add without leaving the
// listing. A client component as a whole, as SearchOverlay is: it keeps the dialog's open state and
// the shopper's choice, and takes functions.
// - The trigger is a 44 px button, `data-slot="quick-view-trigger"`, whose visible words are "Quick
//   view" and whose accessible name is "Quick view: Heritage Hoodie". The visible words are at the
//   start of the name (WCAG 2.5.3 Label in Name), and a card full of triggers has a name for each.
//   `triggerClassName` is where a card puts it; its words wrap (`wrap-anywhere`) rather than push a
//   narrow card wider.
// - The popup is a modal Dialog (the Dialog primitive over Base UI's: focus moves in, Tab and
//   Shift+Tab stay in, one Escape closes it and focus goes back to the trigger, the page behind is
//   inert), `data-slot="quick-view"`. It is named by the buy box's own heading, through
//   `aria-labelledby` and the box's `titleId`: one name, not two (a dialog title above a heading with
//   the same words would be read twice). The box is given `headingLevel={2}`, the dialog's top level.
// - What it holds: ProductGallery (no zoom, since a dialog does not open another, and the thumbnails
//   below the picture) beside the buy box from `md` up, above it below; then the link to the full
//   page (a next/link, `prefetch` from the prop, 44 px), under the box. There is no size guide: a
//   dialog inside a dialog is a trap. The close button is the primitive's (44 px, in the corner,
//   named by the catalog).
// - The popup does not scroll as a whole. It is a column of two parts: a strip of 56 px that holds
//   the corner's close button and nothing else, and the body under it, which scrolls (`overflow-y-auto`).
//   The primitive's own popup scrolls as one, which would carry the close button away with the
//   content, and on a phone, where there is no Escape key, the way out of a tall dialog would be at
//   the top of a long scroll. This way the button is always in the corner and covers nothing. The
//   body holds focusable controls, so axe's `scrollable-region-focusable` is met, and `min-h-0` lets
//   it shrink to the popup, which is never taller than the window. The body is `relative` on
//   purpose: the popup is `fixed`, so it is the containing block of the absolutely positioned parts
//   inside (the number field's hidden input, every visually hidden label), and one of those lying
//   far down the scrolled content would stretch the popup's own scrollable area, which the design
//   system reads as clipped content. With the body as their containing block they scroll with it.
// - The dialog keeps the choice (`useChosenSelection`, starting from `selection` and following it)
//   and gives it to both: the gallery's `selectedValueIds` come from it, so picking a colour shows
//   that colour's picture, and the box starts from it. Every change calls `onSelectionChange`.
// - It stays open after `added`: the shopper sees the confirmation and may close it or keep
//   choosing. A page does not hand it a way to close itself, on purpose.
// - `defaultOpen`, `modal` and `popupClassName` are SearchOverlay's: the design system draws the popup
//   open in a box (D45) with `modal={false}` and a cap on its height, and a popup drawn open at first
//   render takes no focus until a reader opens it again (several on a page would take it from each
//   other, and Base UI closes a popup that focus leaves).
"use client";

import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { BuyBox as BuyBoxContent, VariantSelection } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Link } from "@shopblok/ui/atoms/link";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@shopblok/ui/primitives/dialog";
import { useId, useState } from "react";
import type * as React from "react";
import { BuyBox, type AddStatus, type BuyBoxCopy } from "./buy-box";
import { chosenValueIds, useChosenSelection } from "./buy-box-choice";
import { ProductGallery } from "./product-gallery";

type QuickViewDialogProps = BuyBoxContent & {
  copy: BuyBoxCopy & {
    quickViewDialog: Messages["organisms"]["quickViewDialog"];
    productGallery: Messages["organisms"]["productGallery"];
  };
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The buy box's form action (BuyBox's `action`). */
  action?: string | ((formData: FormData) => void | Promise<void>);
  onSelectionChange?: (selection: VariantSelection) => void;
  status?: AddStatus;
  /**
   * "View full details"'s address for the shopper's choice, so the product page opens on it (SPEC
   * §8.4 reads the choice from the URL; M3 builds it). Left out, the link is `product.href`.
   */
  detailsHref?: (selection: VariantSelection) => string;
  /** next/link's `prefetch` for "View full details"; the design system passes `false`. */
  prefetch?: boolean | null;
  /** Drawn open at first render (the design system's states); takes no focus until a reader opens it again. */
  defaultOpen?: boolean;
  /** `false` leaves the page behind reachable (the design system's open states, D45). */
  modal?: boolean;
  /** Classes for the trigger (a card decides where it sits) and for the popup (the DS caps it). */
  triggerClassName?: string;
  popupClassName?: string;
};

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. The product's `href` is a string the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

/** The gallery's picture is half the popup from `md` up, and the popup's width below it. */
const GALLERY_SIZES = "(min-width: 768px) 420px, calc(100vw - 4rem)";

function QuickViewDialog({
  product,
  selection,
  quantity,
  maxQuantity,
  notes,
  copy,
  locale,
  action,
  onSelectionChange,
  status,
  detailsHref,
  prefetch,
  defaultOpen,
  modal,
  triggerClassName,
  popupClassName,
}: QuickViewDialogProps) {
  const titleId = useId();
  const [open, setOpen] = useState(defaultOpen === true);
  const [chosen, setChosen] = useChosenSelection(selection);
  const words = copy.quickViewDialog;

  function choose(next: VariantSelection) {
    setChosen(next);
    onSelectionChange?.(next);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={modal ?? true}>
      <DialogTrigger
        data-slot="quick-view-trigger"
        aria-label={formatMessage(words.openLabel, { title: product.title }, locale)}
        render={
          <Button variant="outline" className={cn("max-w-full wrap-anywhere", triggerClassName)} />
        }
      >
        {words.open}
      </DialogTrigger>
      <DialogContent
        data-slot="quick-view"
        aria-labelledby={titleId}
        closeLabel={words.close}
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        className={cn(
          "flex min-w-0 flex-col gap-0 overflow-hidden p-0 motion-reduce:duration-0 sm:max-w-xl md:max-w-4xl",
          popupClassName,
        )}
      >
        <div aria-hidden="true" data-slot="quick-view-strip" className="h-14 shrink-0" />
        <div
          data-slot="quick-view-body"
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 sm:pb-6"
        >
          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-8">
            <ProductGallery
              title={product.title}
              media={product.media}
              selectedValueIds={chosenValueIds(product, chosen)}
              copy={copy.productGallery}
              locale={locale}
              thumbnails="below"
              zoom={false}
              sizes={GALLERY_SIZES}
            />
            <div data-slot="quick-view-details-column" className="flex min-w-0 flex-col gap-4">
              <BuyBox
                product={product}
                selection={chosen}
                quantity={quantity}
                maxQuantity={maxQuantity}
                notes={notes}
                copy={copy}
                locale={locale}
                action={action}
                onSelectionChange={choose}
                status={status}
                headingLevel={2}
                titleId={titleId}
              />
              <Link
                href={(detailsHref?.(chosen) ?? product.href) as LinkHref}
                prefetch={prefetch}
                variant="standalone"
                data-slot="quick-view-details"
                className="self-start text-sm wrap-anywhere"
              >
                {words.details}
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { QuickViewDialog };
export type { QuickViewDialogProps };
