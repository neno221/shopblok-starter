// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D99, D100, M5 plan §1a). The
// product page with the pictures one under another in a wide column from `md`, the buy box
// sticking beside them while they scroll; below `md` the gallery's carousel, as the first member's.
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import {
  DetailRest,
  DetailRoot,
  PictureList,
  detailBuyBox,
  detailGallery,
  type ProductDetailTemplateProps,
} from "./parts";

function ProductDetailStacked(props: ProductDetailTemplateProps) {
  const { breadcrumbs, gallery, copy } = props;
  return (
    <DetailRoot member="stacked" {...props}>
      <div className="flex min-w-0 flex-col gap-6">
        <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
        <div className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
          <div data-slot="product-detail-gallery" className="min-w-0">
            <div className="md:hidden">{detailGallery(props, "stacked")}</div>
            <PictureList media={gallery.media} layout="column" sizes="60vw" />
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

export { ProductDetailStacked };
