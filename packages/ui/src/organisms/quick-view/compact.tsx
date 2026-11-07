// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D99, D100, M5 plan §1a). A small
// quick view: one picture (the chosen colour's, or the first), the buy box without the shop's notes
// (the options, the price, "Add to cart") and the link to the full page, beside each other from `sm`
// and one column below it. No carousel and no thumbnails: the full page has every picture. The
// popup is the first member's modal dialog (focus in it, one Escape closes it with focus back on the
// trigger), its body scrolling under the close button's strip (`QuickViewBody`).
"use client";

import type { ProductMedia } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { takesFocusWhenOpenedByAReader } from "@shopblok/ui/lib/reader-focus";
import { cn } from "@shopblok/ui/lib/utils";
import { Dialog, DialogContent } from "@shopblok/ui/primitives/dialog";
import { chosenValueIds } from "../buy-box-choice";
import {
  QuickViewBody,
  QuickViewDetails,
  QuickViewTriggerButton,
  useQuickView,
  type QuickViewDialogProps,
} from "./parts";

/** The picture's column: two fifths of the popup's 36 rem from `sm`, the popup's width below it. */
const PICTURE_SIZES = "(min-width: 640px) 14rem, calc(100vw - 4rem)";

/** The picture that shows a chosen value (the colour), or the first. */
function pictureFor(media: readonly ProductMedia[], valueIds: readonly string[]) {
  return media.find((item) => item.optionValueIds?.some((id) => valueIds.includes(id))) ?? media[0];
}

function QuickViewCompact(props: QuickViewDialogProps) {
  const { product, copy, locale, defaultOpen, modal, trigger = true, finalFocus } = props;
  const state = useQuickView(props);
  const words = copy.quickViewDialog;
  const picture = pictureFor(product.media, chosenValueIds(product, state.chosen));
  return (
    <Dialog open={state.open} onOpenChange={state.setOpen} modal={modal ?? true}>
      {trigger ? (
        <QuickViewTriggerButton
          member="compact"
          product={product}
          copy={words}
          locale={locale}
          className={props.triggerClassName}
        />
      ) : null}
      <DialogContent
        data-slot="quick-view"
        data-variant="compact"
        aria-labelledby={state.titleId}
        closeLabel={words.close}
        initialFocus={defaultOpen === true ? takesFocusWhenOpenedByAReader : undefined}
        {...(finalFocus === undefined ? {} : { finalFocus })}
        className={cn(
          "flex min-w-0 flex-col gap-0 overflow-hidden p-0 motion-reduce:duration-0 sm:max-w-xl",
          props.popupClassName,
        )}
      >
        <QuickViewBody>
          <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start">
            {picture === undefined ? null : (
              <div
                data-slot="quick-view-picture"
                className="relative w-full"
                style={{ aspectRatio: `${picture.width} / ${picture.height}` }}
              >
                <Image
                  src={picture.src}
                  alt={picture.alt}
                  sizes={PICTURE_SIZES}
                  radius="lg"
                  className="absolute inset-0 aspect-auto h-full"
                />
              </div>
            )}
            <QuickViewDetails props={props} state={state} notes={[]} />
          </div>
        </QuickViewBody>
      </DialogContent>
    </Dialog>
  );
}

// The first-load check's marker (D102, `scripts/first-load.ts`): this module is loaded on a press.
QuickViewCompact.displayName = "shopblok:quick-view-compact";

export { QuickViewCompact };
