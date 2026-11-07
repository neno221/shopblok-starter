// Ours (T83, SETUP.md "Product page and quick view variants (T83)"; D99, D100, M5 plan §1a). The
// product page with a band of every picture across the page's width first (from `md`; one row,
// each picture an equal share), then the buy box sticking beside the information, then the reviews
// and the rest. Below `md` the gallery's carousel, then the buy box and the information, one column.
// The buy box comes before the information in the page's order, as its `<h1>` should.
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
import {
  DetailInfo,
  DetailRest,
  DetailRoot,
  PictureList,
  detailBuyBox,
  detailGallery,
  type ProductDetailTemplateProps,
} from "./parts";

function ProductDetailWide(props: ProductDetailTemplateProps) {
  const { breadcrumbs, gallery, copy } = props;
  const share = Math.max(1, Math.round(100 / Math.max(1, gallery.media.length)));
  return (
    <DetailRoot member="wide" {...props}>
      <div className="flex min-w-0 flex-col gap-6">
        <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
        <div data-slot="product-detail-gallery" className="min-w-0">
          <div className="md:hidden">{detailGallery(props, "wide")}</div>
          <PictureList media={gallery.media} layout="band" sizes={`${share}vw`} />
        </div>
      </div>
      <div className="grid min-w-0 gap-10 md:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] md:gap-8 lg:gap-12">
        <div
          data-slot="product-detail-buy-box"
          className="min-w-0 md:sticky md:top-24 md:self-start"
        >
          {detailBuyBox(props)}
        </div>
        <div className="min-w-0">
          <DetailInfo {...props} />
        </div>
      </div>
      <DetailRest {...props} withInfo={false} />
    </DetailRoot>
  );
}

export { ProductDetailWide };
