import type { Image, ProductDetail } from "@shopblok/registry/contracts";
import { PLACEHOLDER_IMAGE } from "./common";

// Apart from `product-page.ts`, which the product page's islands import: the placeholder's picture
// stays out of their bundle.

/** The most pictures the gallery takes (`ProductGallery`). */
export const MAX_GALLERY_MEDIA = 24;

/**
 * The product's pictures with the shop's after Medusa's (D83, T69): Medusa's placeholder goes once
 * the shop has a picture, and the gallery keeps its 24.
 */
export function withShopPictures(detail: ProductDetail, pictures: readonly Image[]): ProductDetail {
  if (pictures.length === 0) return detail;
  const own = detail.media.filter((each) => each.src !== PLACEHOLDER_IMAGE.src);
  return { ...detail, media: [...own, ...pictures].slice(0, MAX_GALLERY_MEDIA) };
}
