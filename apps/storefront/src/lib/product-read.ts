import "server-only";
import type { Messages } from "@shopblok/i18n";
import { readProductContent } from "./cms/catalog";
import type { ProductContent } from "./cms/catalog-content";
import { cmsOrNull } from "./cms/read";
import type { MarketContext } from "./market-context";
import { getProduct } from "./medusa/products";
import { PLACEHOLDER_HANDLE } from "./prerender";
import { toProductDetail } from "./view-models/product";
import { withShopPictures } from "./view-models/product-pictures";

// The product as a market shows it (T49, T69; PR 120 review, item 4): Medusa's product in the
// market's region and language, the shop's content on it from Payload (its rich description, its
// pictures after Medusa's), and the view model with those pictures. The product page and the quick
// view's route (`/next/quick-view`, T83) both read it here, so they agree on what is a 404: the
// stand-in's placeholder (asking Medusa nothing, D10), a handle Medusa does not have, and a product
// with no price in the region.

export type MarketProduct = {
  product: NonNullable<Awaited<ReturnType<typeof getProduct>>>;
  /** The view model, with the shop's pictures after Medusa's. */
  detail: NonNullable<ReturnType<typeof toProductDetail>>;
  /** The shop's content on the product (T69); `null` without one. */
  content: ProductContent | null;
};

/** The product `handle` in the market of `context`, or `null` for a 404. */
export async function readMarketProduct(
  context: MarketContext,
  messages: Messages,
  handle: string,
  { draft, from }: { draft: boolean; from: string },
): Promise<MarketProduct | null> {
  if (handle === "" || handle === PLACEHOLDER_HANDLE) return null;
  const { market } = context;
  const [product, content] = await Promise.all([
    getProduct(handle, { regionId: context.region.id, locale: market.medusaLocale }),
    cmsOrNull(readProductContent({ market, draft }, handle), `${from}: Medusa's text alone`),
  ]);
  if (product === null) return null;
  const detail = toProductDetail(product, {
    hrefs: context.hrefs,
    home: { label: messages.templates.productDetail.home, href: context.url("/") },
  });
  if (detail === null) return null;
  return { product, detail: withShopPictures(detail, content?.gallery ?? []), content };
}
