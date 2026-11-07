// Ours (T49, SETUP.md "Product page (T49)"; D56, D57, D61, SPEC §8.4, SBP layouts/product-details.md).
// The product page's `<main>`: the breadcrumbs, then the gallery and the buy box side by side from
// `md` (the gallery first, a little wider; the buy box sticks under the header while the pictures
// scroll), then the information, the reviews, the related products and, when the page has one, the
// recently viewed row. Below `md` it is one column in that order, and the sticky bar keeps "Add to
// cart" in reach once the buy box's button has scrolled away. The family's first member (D99); what
// the members share, the islands' places included, is in `parts.tsx` (T83).
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import {
  DetailRest,
  DetailRoot,
  GALLERY_SIZES,
  PRODUCT_DETAIL_IDS,
  detailBuyBox,
  detailGallery,
  productDetailCopy,
  type ProductDetailCopy,
  type ProductDetailIds,
  type ProductDetailTemplateProps,
} from "./parts";

function ProductDetailDefault(props: ProductDetailTemplateProps) {
  const { breadcrumbs, copy } = props;
  return (
    <DetailRoot member="default" {...props}>
      <div className="flex min-w-0 flex-col gap-6">
        <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
        <div className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:gap-12">
          <div data-slot="product-detail-gallery" className="min-w-0">
            {detailGallery(props, "default")}
          </div>
          <div
            data-slot="product-detail-buy-box"
            className="min-w-0 md:sticky md:top-24 md:self-start"
          >
            {detailBuyBox(props)}
          </div>
        </div>
      </div>
      <DetailRest {...props} />
    </DetailRoot>
  );
}

export { GALLERY_SIZES, PRODUCT_DETAIL_IDS, ProductDetailDefault, productDetailCopy };
export type { ProductDetailCopy, ProductDetailIds, ProductDetailTemplateProps };
