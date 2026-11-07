// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D99, D100, M5 plan §1a). The
// product page for a product with one picture: the picture in a narrow column centred on the page
// and the buy box under it in the same column (not sticky: it is already in view), then the
// information, the reviews and the rest as the first member draws them. A product with several
// pictures still shows them all, through the gallery's carousel and its thumbnails under it.
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import {
  DetailRest,
  DetailRoot,
  detailBuyBox,
  detailGallery,
  type ProductDetailTemplateProps,
} from "./parts";

function ProductDetailCentered(props: ProductDetailTemplateProps) {
  const { breadcrumbs, copy } = props;
  return (
    <DetailRoot member="centered" {...props}>
      <div className="flex min-w-0 flex-col gap-6">
        <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
        <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-8">
          <div data-slot="product-detail-gallery" className="min-w-0">
            {detailGallery(props, "centered")}
          </div>
          <div data-slot="product-detail-buy-box" className="min-w-0">
            {detailBuyBox(props)}
          </div>
        </div>
      </div>
      <DetailRest {...props} />
    </DetailRoot>
  );
}

export { ProductDetailCentered };
