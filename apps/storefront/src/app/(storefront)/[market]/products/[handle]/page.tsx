import type { Messages } from "@shopblok/i18n";
import type { ProductCard } from "@shopblok/registry/contracts";
import {
  GALLERY_SIZES,
  PRODUCT_DETAIL_IDS,
  ProductDetailTemplate,
  productDetailCopy,
} from "@shopblok/ui/templates/product-detail";
import { BuyBox } from "@shopblok/ui/organisms/buy-box";
import { MobileStickyATC } from "@shopblok/ui/organisms/mobile-sticky-atc";
import { ProductGallery } from "@shopblok/ui/organisms/product-gallery";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { cache, Suspense } from "react";
import { BuyBoxIsland } from "../../../../../components/pdp/buy-box-island";
import { GalleryIsland } from "../../../../../components/pdp/gallery-island";
import { RecentlyViewed } from "../../../../../components/pdp/recently-viewed";
import { getCurrentMarket } from "../../../../../lib/current-market";
import { getMarketContext, type MarketContext } from "../../../../../lib/market-context";
import { hreflangAlternates } from "../../../../../lib/markets/hreflang";
import {
  getProduct,
  listProductHandles,
  listProductsByIds,
} from "../../../../../lib/medusa/products";
import { searchProducts } from "../../../../../lib/medusa/search";
import { PLACEHOLDER_HANDLE, productHandlesToPrerender } from "../../../../../lib/prerender";
import {
  jsonLdText,
  metaDescription,
  productJsonLd,
  shareableImage,
  siteBase,
} from "../../../../../lib/seo/product";
import { SHELL_PREFETCH, siteText } from "../../../../../lib/site";
import { toProductCard, toProductDetail } from "../../../../../lib/view-models/product";
import { RELATED_PRODUCTS, toProductDetailPage } from "../../../../../lib/view-models/product-page";

// D58, D61 (T49): the product page, in the static shell. Everything the server draws comes from
// `cached()` entries (the product, the related products, the map, the region), so the route is
// `ensureStatic = "navigation"`: a `cookies()`, a `connection()` or an uncached read anywhere in it
// fails the build. `notFound()` is called before any `Suspense`, so a missing product is a real 404.
// What follows the visitor is an island: the buy box and the gallery read `?variant=` in the
// browser (each in a `Suspense` whose fallback is the server's default choice), and the recently
// viewed row reads `localStorage`.

export const ensureStatic = "navigation";

type Params = { market: string; handle: string };
type Props = { params: Promise<Params> };

/** D58: the first `STOREFRONT_PRERENDER_PRODUCTS` handles, or the stand-in's placeholder. */
export async function generateStaticParams(): Promise<{ handle: string }[]> {
  const handles = await productHandlesToPrerender(listProductHandles);
  return handles.map((handle) => ({ handle }));
}

type PageData = {
  context: MarketContext;
  messages: Messages;
  product: NonNullable<Awaited<ReturnType<typeof getProduct>>>;
  detail: NonNullable<ReturnType<typeof toProductDetail>>;
};

/** The product and its market, or `null` for a page that is a 404. Shared by the page and metadata. */
const readPage = cache(async (handle: string): Promise<PageData | null> => {
  // The stand-in's placeholder asks Medusa nothing: a build without it renders this 404 (D10).
  if (handle === PLACEHOLDER_HANDLE) return null;
  const market = await getCurrentMarket();
  const [context, messages] = await Promise.all([getMarketContext(market.key), getMessages()]);
  if (context === null) return null;
  const product = await getProduct(handle, {
    regionId: context.region.id,
    locale: market.medusaLocale,
  });
  if (product === null) return null;
  const detail = toProductDetail(product, {
    hrefs: context.hrefs,
    home: {
      label: messages.templates.productDetail.home,
      href: context.url("/"),
    },
  });
  return detail === null ? null : { context, messages, product, detail };
});

/** The same category's first products, without this one (D61). */
async function readRelated({ context, product }: PageData): Promise<ProductCard[]> {
  const [category] = product.categories;
  if (category === undefined) return [];
  const query = {
    regionId: context.region.id,
    locale: context.market.medusaLocale,
  };
  const result = await searchProducts({
    locale: query.locale,
    currencyCode: context.region.currencyCode,
    query: "",
    filters: { categoryIds: [category.id] },
    sort: "relevance",
    page: 1,
    pageSize: RELATED_PRODUCTS + 1,
  });
  const ids = result.ids.filter((id) => id !== product.id).slice(0, RELATED_PRODUCTS);
  if (ids.length === 0) return [];
  const products = await listProductsByIds(ids, query);
  return products.flatMap((each) => toProductCard(each, context.hrefs) ?? []);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const page = await readPage(handle);
  if (page === null) return {};
  const { context, detail } = page;
  const path = `/products/${encodeURIComponent(detail.handle)}`;
  const description = metaDescription(detail.description);
  const [first] = detail.media;
  const image = first === undefined ? undefined : shareableImage(first.src, siteBase());
  return {
    title: detail.title,
    ...(description === "" ? {} : { description }),
    alternates: {
      // The base PDP: `?variant=` names a choice of this page, never a page of its own (SPEC §12).
      canonical: detail.href,
      languages: hreflangAlternates(path, context.map),
    },
    openGraph: {
      type: "website",
      title: detail.title,
      url: detail.href,
      ...(description === "" ? {} : { description }),
      ...(image === undefined || first === undefined
        ? {}
        : {
            images: [
              {
                url: image,
                width: first.width,
                height: first.height,
                alt: first.alt,
              },
            ],
          }),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const page = await readPage(handle);
  if (page === null) notFound();
  const { context, messages, product, detail } = page;
  const { market } = context;
  const related = await readRelated(page);
  const text = siteText(market.language);
  const headings = messages.templates.productDetail;
  const content = toProductDetailPage(detail, related, {
    headings,
    notes: text.productNotes,
    delivery: text.delivery,
  });
  const copy = productDetailCopy(messages);
  const locale = market.htmlLang;
  const ids = PRODUCT_DETAIL_IDS;
  const card = toProductCard(product, context.hrefs);

  const serverBuyBox = (
    <>
      <BuyBox
        {...content.buyBox}
        copy={copy.buyBox}
        locale={locale}
        reviewsHref={`#${ids.reviews}`}
        formId={ids.form}
        optionsId={ids.options}
        buttonId={ids.button}
        titleId={ids.title}
      />
      <MobileStickyATC
        {...content.sticky}
        copy={copy.sticky}
        locale={locale}
        watch={ids.button}
        formId={ids.form}
        optionsHref={`#${ids.options}`}
      />
    </>
  );
  const serverGallery = (
    <ProductGallery
      {...content.gallery}
      copy={copy.gallery}
      locale={locale}
      sizes={GALLERY_SIZES}
      priority
    />
  );

  return (
    <>
      <script
        type="application/ld+json"
        // A product's own texts, escaped by `jsonLdText` so they cannot close the element.
        dangerouslySetInnerHTML={{ __html: jsonLdText(productJsonLd(detail)) }}
      />
      <ProductDetailTemplate
        {...content}
        copy={copy}
        locale={locale}
        reviewsHrefFor={(n) => (n === 1 ? detail.href : `${detail.href}?reviews=${n}`)}
        prefetch={SHELL_PREFETCH}
        slots={{
          // D61: beside the server's buy box, not around it, so the default variant's price is in
          // the static HTML (the fallback) and the island takes over once the browser has the URL.
          buyBox: (
            <Suspense fallback={serverBuyBox}>
              <BuyBoxIsland
                product={detail}
                notes={content.buyBox.notes}
                maxQuantity={content.buyBox.maxQuantity}
                market={market.key}
                locale={locale}
                copy={{ buyBox: copy.buyBox, sticky: copy.sticky }}
                ids={ids}
              />
            </Suspense>
          ),
          gallery: (
            <Suspense fallback={serverGallery}>
              <GalleryIsland
                {...content.gallery}
                choice={{
                  id: detail.id,
                  options: detail.options,
                  variants: detail.variants,
                }}
                copy={copy.gallery}
                locale={locale}
                sizes={GALLERY_SIZES}
              />
            </Suspense>
          ),
          recentlyViewed: (
            <RecentlyViewed
              market={market.key}
              current={card}
              title={headings.recentlyViewed}
              copy={copy.carousel}
              locale={locale}
              prefetch={SHELL_PREFETCH}
            />
          ),
        }}
      />
    </>
  );
}
