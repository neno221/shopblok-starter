"use client";

import type { ProductDetail, ProductGallery as GalleryContent } from "@shopblok/registry/contracts";
import { chosenValueIds } from "@shopblok/ui/organisms/buy-box-choice";
import { ProductGallery } from "@shopblok/ui/organisms/product-gallery";
import type { ProductGalleryProps } from "@shopblok/ui/organisms/product-gallery";
import { useSearchParams } from "next/navigation";
import { defaultSelection, selectionForVariant } from "../../lib/view-models/product-page";
import { usePublishedChoice } from "./choice-store";

// D61: the gallery that shows the chosen colour's pictures. Its first paint follows `?variant=` (in a
// `Suspense` whose fallback is the server's gallery with nothing chosen), then the buy box island's
// choice, which may hold a colour before a size.

export type GalleryIslandProps = GalleryContent & {
  choice: Pick<ProductDetail, "id" | "options" | "variants">;
  copy: ProductGalleryProps["copy"];
  locale: string;
  sizes: string;
};

export function GalleryIsland({ choice, copy, locale, sizes, ...gallery }: GalleryIslandProps) {
  const fromUrl = useSearchParams().get("variant");
  const selection =
    usePublishedChoice(choice.id) ??
    selectionForVariant(choice, fromUrl) ??
    defaultSelection(choice);
  return (
    <ProductGallery
      {...gallery}
      selectedValueIds={chosenValueIds(choice, selection)}
      copy={copy}
      locale={locale}
      sizes={sizes}
      priority
    />
  );
}
