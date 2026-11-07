// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D99, D100, M5 plan §1a). The
// quick view in a side sheet from the end edge (the left in a right-to-left language): the same
// pictures (no zoom, the thumbnails below), the buy box under them in one column, and the link to
// the full page. The sheet is Base UI's dialog, as the first member's popup is: modal, focus in it,
// one Escape closes it with focus back on the trigger, the page behind inert. Its body scrolls
// under the close button's strip, so the button stays in the corner (`QuickViewBody`).
"use client";

import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import { Dialog } from "@shopblok/ui/primitives/dialog";
import { SheetContent } from "@shopblok/ui/primitives/sheet";
import { chosenValueIds } from "../buy-box-choice";
import { ProductGallery } from "../product-gallery";
import {
  QuickViewBody,
  QuickViewDetails,
  QuickViewTriggerButton,
  useQuickView,
  type QuickViewDialogProps,
} from "./parts";

/** The sheet's width: three quarters of a phone, 28 rem from `sm`, less its padding. */
const GALLERY_SIZES = "(min-width: 640px) 26rem, 70vw";

function QuickViewDrawer(props: QuickViewDialogProps) {
  const { product, copy, locale, defaultOpen, modal, trigger = true, finalFocus } = props;
  const state = useQuickView(props);
  const words = copy.quickViewDialog;
  return (
    <Dialog open={state.open} onOpenChange={state.setOpen} modal={modal ?? true}>
      {trigger ? (
        <QuickViewTriggerButton
          member="drawer"
          product={product}
          copy={words}
          locale={locale}
          className={props.triggerClassName}
        />
      ) : null}
      <SheetContent
        side="inline-end"
        data-slot="quick-view"
        data-variant="drawer"
        aria-labelledby={state.titleId}
        closeLabel={words.close}
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        {...(finalFocus === undefined ? {} : { finalFocus })}
        className={cn(
          "min-w-0 gap-0 overflow-hidden motion-reduce:duration-0 data-[side=inline-end]:sm:max-w-md",
          props.popupClassName,
        )}
      >
        <QuickViewBody className="flex flex-col gap-6">
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
        </QuickViewBody>
      </SheetContent>
    </Dialog>
  );
}

// The first-load check's marker (D102, `scripts/first-load.ts`): this module is loaded on a press.
QuickViewDrawer.displayName = "shopblok:quick-view-drawer";

export { QuickViewDrawer };
