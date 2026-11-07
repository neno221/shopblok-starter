// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D99, D100, M5 plan §1a). The
// product page with the main picture over a row of its thumbnails (ProductGallery's `below`
// layout), the gallery and the buy box in two equal columns from `md`, the buy box sticky; then the
// information, the reviews and the rest as the first member draws them. The plan's
// `thumbnails-beside` was the first member's own layout (its thumbnails stand beside the picture),
// so this member puts them under it instead (§0, item 3: a renamed variant keeps the count).
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import {
  DetailRest,
  DetailRoot,
  detailBuyBox,
  detailGallery,
  type ProductDetailTemplateProps,
} from "./parts";

function ProductDetailThumbnailsBelow(props: ProductDetailTemplateProps) {
  const { breadcrumbs, copy } = props;
  return (
    <DetailRoot member="thumbnails-below" {...props}>
      <div className="flex min-w-0 flex-col gap-6">
        <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
        <div className="grid min-w-0 gap-8 md:grid-cols-2 lg:gap-12">
          <div data-slot="product-detail-gallery" className="min-w-0">
            {detailGallery(props, "thumbnails-below")}
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

export { ProductDetailThumbnailsBelow };
