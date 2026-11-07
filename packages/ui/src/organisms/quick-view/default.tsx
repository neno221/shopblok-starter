// Ours (T38, SETUP.md "Product-page organisms (T38)"; SPEC §8.4, D41, D45, D49). A product's picture
// and buy box in a dialog, opened from a card, so a shopper can choose and add without leaving the
// listing. A client component as a whole, as SearchOverlay is: it keeps the dialog's open state and
// the shopper's choice, and takes functions. The family's first member (D99); what the members
// share, the trigger and the choice included, is in `parts.tsx` (T83).
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
//   the corner's close button and nothing else, and the body under it, which scrolls
//   (`QuickViewBody`). The primitive's own popup scrolls as one, which would carry the close button
//   away with the content, and on a phone, where there is no Escape key, the way out of a tall
//   dialog would be at the top of a long scroll. `min-h-0` lets the body shrink to the popup, which
//   is never taller than the window.
"use client";

import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import { Dialog, DialogContent } from "@shopblok/ui/primitives/dialog";
import { chosenValueIds } from "../buy-box-choice";
import { ProductGallery } from "../product-gallery";
import {
  QuickViewBody,
  QuickViewDetails,
  QuickViewTriggerButton,
  useQuickView,
  type QuickViewDialogProps,
} from "./parts";

/** The gallery's picture is half the popup from `md` up, and the popup's width below it. */
const GALLERY_SIZES = "(min-width: 768px) 420px, calc(100vw - 4rem)";

function QuickViewDefault(props: QuickViewDialogProps) {
  const { product, copy, locale, defaultOpen, modal, trigger = true, finalFocus } = props;
  const state = useQuickView(props);
  const words = copy.quickViewDialog;
  return (
    <Dialog open={state.open} onOpenChange={state.setOpen} modal={modal ?? true}>
      {trigger ? (
        <QuickViewTriggerButton
          member="default"
          product={product}
          copy={words}
          locale={locale}
          className={props.triggerClassName}
        />
      ) : null}
      <DialogContent
        data-slot="quick-view"
        data-variant="default"
        aria-labelledby={state.titleId}
        closeLabel={words.close}
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        {...(finalFocus === undefined ? {} : { finalFocus })}
        className={cn(
          "flex min-w-0 flex-col gap-0 overflow-hidden p-0 motion-reduce:duration-0 sm:max-w-xl md:max-w-4xl",
          props.popupClassName,
        )}
      >
        <QuickViewBody>
          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-8">
            <ProductGallery
              title={product.title}
              media={product.media}
              selectedValueIds={chosenValueIds(product, state.chosen)}
              copy={copy.productGallery}
              locale={locale}
              thumbnails="below"
              zoom={false}
              sizes={GALLERY_SIZES}
            />
            <QuickViewDetails props={props} state={state} />
          </div>
        </QuickViewBody>
      </DialogContent>
    </Dialog>
  );
}

// The first-load check's marker (D102, `scripts/first-load.ts`): this module is loaded on a press.
QuickViewDefault.displayName = "shopblok:quick-view-default";

export { QuickViewDefault };
export type { QuickViewDialogProps };
