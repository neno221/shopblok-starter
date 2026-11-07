// Ours (T38, T83; SETUP.md "Product-page organisms (T38)", "Product page and quick view variants
// (T83)"; SPEC §8.4, D41, D45, D49, D99). What the `quick-view` family's members share: their props,
// the dialog's state and the shopper's choice, the trigger the design system draws, the buy box's
// column with the link to the full page, and the body that scrolls under the close button.
// - The trigger is a 44 px button, `data-slot="quick-view-trigger"` with the member's
//   `data-variant` (the family's root, D99), whose visible words are "Quick view" and whose
//   accessible name is "Quick view: Heritage Hoodie" (WCAG 2.5.3 Label in Name). A shop's listing
//   card draws its own (`trigger.tsx`, with no dialog code) and opens the member with
//   `trigger={false}`, `open` and `finalFocus` on that button.
// - The dialog keeps the choice (`useChosenSelection`, starting from `selection` and following it)
//   and gives it to the pictures and the box. Every change calls `onSelectionChange`. It stays open
//   after `added`: the shopper sees the confirmation and may close it or keep choosing.
// - `defaultOpen`, `modal` and `popupClassName` are SearchOverlay's: the design system draws the
//   popup open in a box (D45) with `modal={false}` and a cap on its height, and a popup drawn open
//   at first render takes no focus until a reader opens it again.
"use client";

import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type {
  BuyBox as BuyBoxContent,
  VariantOf,
  VariantSelection,
} from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Link } from "@shopblok/ui/atoms/link";
import { cn } from "@shopblok/ui/lib/utils";
import { DialogTrigger } from "@shopblok/ui/primitives/dialog";
import { useId, useState } from "react";
import type * as React from "react";
import { BuyBox, type AddStatus, type BuyBoxCopy } from "../buy-box";
import { useChosenSelection } from "../use-chosen-selection";

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
  /** Open, from the page's own trigger (T83: the listing card's); with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** `false`: no trigger of its own (the page's opens it, `open`). */
  trigger?: boolean;
  /** Where focus goes when it closes: the page's trigger, when it has no trigger of its own. */
  finalFocus?: React.RefObject<HTMLElement | null> | (() => HTMLElement | null);
  /** `false` leaves the page behind reachable (the design system's open states, D45). */
  modal?: boolean;
  /** Classes for the trigger (a card decides where it sits) and for the popup (the DS caps it). */
  triggerClassName?: string;
  popupClassName?: string;
};

// `Link` takes whatever `next/link` takes, which an app with typed routes narrows to its own
// routes. The product's `href` is a string the app built, so the cast follows the app's type.
type LinkHref = React.ComponentProps<typeof Link>["href"];

/** The dialog's open state (its own, or the page's) and the shopper's choice. */
function useQuickView(props: QuickViewDialogProps) {
  const titleId = useId();
  const [ownOpen, setOwnOpen] = useState(props.defaultOpen === true);
  const [chosen, setChosen] = useChosenSelection(props.selection);
  return {
    titleId,
    open: props.open ?? ownOpen,
    setOpen(next: boolean) {
      setOwnOpen(next);
      props.onOpenChange?.(next);
    },
    chosen,
    choose(next: VariantSelection) {
      setChosen(next);
      props.onSelectionChange?.(next);
    },
  };
}

/** The design system's trigger: what a card holds, with the member's `data-variant` (D99). */
function QuickViewTriggerButton({
  member,
  product,
  copy,
  locale,
  className,
}: {
  member: VariantOf<"quick-view">;
  product: { title: string };
  copy: Messages["organisms"]["quickViewDialog"];
  locale: string;
  className?: string | undefined;
}) {
  return (
    <DialogTrigger
      data-slot="quick-view-trigger"
      data-variant={member}
      aria-label={formatMessage(copy.openLabel, { title: product.title }, locale)}
      render={<Button variant="outline" className={cn("max-w-full wrap-anywhere", className)} />}
    >
      {copy.open}
    </DialogTrigger>
  );
}

/**
 * The popup's body under the close button's strip: it scrolls on its own, so the button stays in
 * the corner (T38). `relative` on purpose: the popup is `fixed`, and the absolutely positioned
 * parts inside (the number field's hidden input, every visually hidden label) must scroll with the
 * body rather than stretch the popup's own scrollable area.
 */
function QuickViewBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden="true" data-slot="quick-view-strip" className="h-14 shrink-0" />
      <div
        data-slot="quick-view-body"
        className={cn(
          "relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 sm:pb-6",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}

/** The buy box, named as the dialog's title (an h2), and the link to the full page under it. */
function QuickViewDetails({
  props,
  state,
  notes = props.notes,
}: {
  props: QuickViewDialogProps;
  state: ReturnType<typeof useQuickView>;
  /** The box's notes: the compact member leaves them out. */
  notes?: string[];
}) {
  const { product, quantity, maxQuantity, copy, locale, action, status, detailsHref, prefetch } =
    props;
  return (
    <div data-slot="quick-view-details-column" className="flex min-w-0 flex-col gap-4">
      <BuyBox
        product={product}
        selection={state.chosen}
        quantity={quantity}
        maxQuantity={maxQuantity}
        notes={notes}
        copy={copy}
        locale={locale}
        action={action}
        onSelectionChange={state.choose}
        status={status}
        headingLevel={2}
        titleId={state.titleId}
      />
      <Link
        href={(detailsHref?.(state.chosen) ?? product.href) as LinkHref}
        prefetch={prefetch}
        variant="standalone"
        data-slot="quick-view-details"
        className="self-start text-sm wrap-anywhere"
      >
        {copy.quickViewDialog.details}
      </Link>
    </div>
  );
}

export { QuickViewBody, QuickViewDetails, QuickViewTriggerButton, useQuickView };
export type { QuickViewDialogProps };
