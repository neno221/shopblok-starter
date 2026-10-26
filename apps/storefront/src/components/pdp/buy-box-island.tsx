"use client";

import type { ProductDetail, VariantSelection } from "@shopblok/registry/contracts";
import { BuyBox, type AddStatus, type BuyBoxCopy } from "@shopblok/ui/organisms/buy-box";
import { stickyFor, variantFor } from "@shopblok/ui/organisms/buy-box-choice";
import {
  MobileStickyATC,
  type MobileStickyATCProps,
} from "@shopblok/ui/organisms/mobile-sticky-atc";
import type { ProductDetailIds } from "@shopblok/ui/templates/product-detail";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { addToCart } from "../../lib/actions/cart";
import { defaultSelection, selectionForVariant } from "../../lib/view-models/product-page";
import { announceAdded } from "../../lib/visitor/cart-events";
import { setCartCount } from "../../lib/visitor/store";
import { publishChoice } from "./choice-store";

// D61: the product page's buy box with the choice in the URL. It reads `?variant=` (so it sits in a
// `Suspense` whose fallback is the server's buy box for the default choice: the static HTML keeps the
// default variant's price), keeps the URL in step with a full choice through `history.replaceState`
// (Next keeps `useSearchParams` in step with it, and no navigation runs), publishes the choice for
// the gallery island, adds through the cart's server action, tells the visitor store the new
// count, so the header's badge follows, and says which line it added, so the header's quick cart
// opens on it (T52). The sticky bar is drawn here because it follows the choice and submits this
// form. The URL is read again only when it names another variant than the one written last (a link
// to `?variant=…`), so a choice with an option still missing, which the URL cannot hold,
// is never thrown away.

export type BuyBoxIslandProps = {
  product: ProductDetail;
  notes: string[];
  maxQuantity: number;
  market: string;
  locale: string;
  copy: { buyBox: BuyBoxCopy; sticky: MobileStickyATCProps["copy"] };
  ids: ProductDetailIds;
};

/** The URL's `variant` for a choice: the variant it names, or none for a choice still missing one. */
function writeVariant(variantId: string | null): void {
  const url = new URL(window.location.href);
  if (variantId === null) url.searchParams.delete("variant");
  else url.searchParams.set("variant", variantId);
  if (url.href !== window.location.href) window.history.replaceState(null, "", url);
}

export function BuyBoxIsland({
  product,
  notes,
  maxQuantity,
  market,
  locale,
  copy,
  ids,
}: BuyBoxIslandProps) {
  const fromUrl = useSearchParams().get("variant");
  const selectionOf = (variantId: string | null) =>
    selectionForVariant(product, variantId) ?? defaultSelection(product);
  const [written, setWritten] = useState(fromUrl);
  const [selection, setSelection] = useState<VariantSelection>(() => selectionOf(fromUrl));
  const [current, setCurrent] = useState<VariantSelection>(selection);
  if (fromUrl !== written) {
    // Another variant was put in the URL from outside this box: it is the choice now.
    const next = selectionOf(fromUrl);
    setWritten(fromUrl);
    setSelection(next);
    setCurrent(next);
  }

  useEffect(() => {
    publishChoice(product.id, current);
  }, [product.id, current]);

  const [status, submit, pending] = useActionState(
    async (_previous: AddStatus, form: FormData): Promise<AddStatus> => {
      const result = await addToCart({
        market,
        variantId: form.get("variantId"),
        quantity: form.get("quantity"),
      });
      if (!result.ok) return "error";
      setCartCount(result.data.count);
      announceAdded(result.data.line.id);
      return "added";
    },
    "idle",
  );

  function choose(next: VariantSelection) {
    const variantId = variantFor(product, next)?.id ?? null;
    // The box's own prop follows too: a later link back to the variant it opened on is then a
    // change BuyBox sees, and it draws the link's choice instead of keeping this one.
    setSelection(next);
    setCurrent(next);
    setWritten(variantId);
    writeVariant(variantId);
  }

  // The wrapper says the island has replaced the server's buy box (a test waits for it).
  return (
    <div data-slot="buy-box-island" className="contents">
      <BuyBox
        product={product}
        selection={selection}
        quantity={1}
        maxQuantity={maxQuantity}
        notes={notes}
        copy={copy.buyBox}
        locale={locale}
        action={submit}
        onSelectionChange={choose}
        status={pending ? "adding" : status}
        reviewsHref={`#${ids.reviews}`}
        formId={ids.form}
        optionsId={ids.options}
        buttonId={ids.button}
        titleId={ids.title}
      />
      <MobileStickyATC
        {...stickyFor(product, current)}
        copy={copy.sticky}
        locale={locale}
        watch={ids.button}
        formId={ids.form}
        optionsHref={`#${ids.options}`}
      />
    </div>
  );
}
