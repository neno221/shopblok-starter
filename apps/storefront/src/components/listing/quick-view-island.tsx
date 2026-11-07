"use client";

import type { VariantSelection } from "@shopblok/registry/contracts";
import type { AddStatus } from "@shopblok/ui/organisms/buy-box";
import { variantFor } from "@shopblok/ui/organisms/buy-box-choice";
import { QuickViewDialog } from "@shopblok/ui/organisms/quick-view-dialog";
import { useActionState, useEffect, useState } from "react";
import { addToCart } from "../../lib/actions/cart";
import type { QuickViewAnswer } from "../../lib/listing/quick-view";
import { setCartCount } from "../../lib/visitor/store";

// D101, D102 (T83): the quick view a listing's card opens, loaded on the card's first press
// (`quick-view-opener.tsx`), so neither this module nor the dialog's members are in a route's first
// load (`scripts/first-load.ts`, `keptOut`). It asks `/next/quick-view` for the product (the
// market's region and language, the catalog's answer), says the button is busy meanwhile, and opens
// the member the `templates` global picked, with no trigger of its own: the card's button is the
// trigger, and focus goes back to it when the dialog closes. "Add to cart" goes through the cart's
// server action, as the product page's buy box does, and the header's badge follows; the dialog
// stays open on "Added to cart" (it is the shopper's to close). "View full details" opens the
// product's page on the choice (`?variant=`). If the product cannot be read (it went, Medusa is
// down), the button does what it does without scripts: it opens the product's page.

export type QuickViewIslandProps = {
  market: string;
  handle: string;
  /** The product's page, the card's form's action. */
  href: string;
  /** The member, from the card's button (`data-variant`); the family's first if none. */
  variant: string | undefined;
  /** The card's button: busy while the product loads, focused again when the dialog closes. */
  from: HTMLElement | null;
  /** Counts the presses: each one opens the dialog again (the island stays, with its product). */
  press: number;
};

/** Where to ask. */
export const QUICK_VIEW_ROUTE = "/next/quick-view";

export function QuickViewIsland({
  market,
  handle,
  href,
  variant,
  from,
  press,
}: QuickViewIslandProps) {
  const [answer, setAnswer] = useState<QuickViewAnswer | null>(null);
  const [open, setOpen] = useState(true);
  const [opened, setOpened] = useState(press);
  // Another press on the same product's button (the island stays): open again.
  if (opened !== press) {
    setOpened(press);
    setOpen(true);
  }

  useEffect(() => {
    const abort = new AbortController();
    from?.setAttribute("aria-busy", "true");
    const params = new URLSearchParams({ market, handle });
    fetch(`${QUICK_VIEW_ROUTE}?${params}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`quick view: ${response.status}`);
        return (await response.json()) as QuickViewAnswer;
      })
      .then(setAnswer, () => {
        if (!abort.signal.aborted) window.location.assign(href);
      })
      .finally(() => from?.removeAttribute("aria-busy"));
    return () => abort.abort();
    // The product is read once per island; a later press reopens it. `from` is the first press's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, handle, href]);

  const [status, submit, pending] = useActionState(
    async (_previous: AddStatus, form: FormData): Promise<AddStatus> => {
      const result = await addToCart({
        market,
        variantId: form.get("variantId"),
        quantity: form.get("quantity"),
      });
      if (!result.ok) return "error";
      setCartCount(result.data.count);
      return "added";
    },
    "idle",
  );

  if (answer === null) return null;
  const { box } = answer;
  const detailsHref = (selection: VariantSelection) => {
    const chosen = variantFor(box.product, selection);
    return chosen === undefined
      ? box.product.href
      : `${box.product.href}?variant=${encodeURIComponent(chosen.id)}`;
  };
  return (
    <QuickViewDialog
      {...box}
      variant={variant as never}
      copy={answer.copy}
      locale={answer.locale}
      action={submit}
      status={pending ? "adding" : status}
      detailsHref={detailsHref}
      open={open}
      onOpenChange={setOpen}
      trigger={false}
      finalFocus={() => from}
    />
  );
}

QuickViewIsland.displayName = "shopblok:quick-view-island";
