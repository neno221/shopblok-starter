import { HomeTemplate, homeCopy } from "@shopblok/ui/templates/home";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { cache } from "react";
import { CmsPageView } from "../../../components/cms/cms-page-view";
import { RefreshOnSave } from "../../../components/cms/refresh-on-save";
import { getShellData } from "../../../components/shell/shell-data";
import { cmsPageContent } from "../../../lib/cms/page-content";
import { readHomepage } from "../../../lib/cms/pages";
import { categoryPicture } from "../../../lib/cms/resolve/catalog";
import { catalogReads } from "../../../lib/cms/resolve/market";
import { getCurrentMarket } from "../../../lib/current-market";
import { getMarketContext, type MarketContext } from "../../../lib/market-context";
import { hreflangAlternates } from "../../../lib/markets/hreflang";
import { flattenCategories, listCategories } from "../../../lib/medusa/categories";
import { listProductsByIds } from "../../../lib/medusa/products";
import { searchProducts } from "../../../lib/medusa/search";
import { buildReadsMedusa } from "../../../lib/prerender";
import { homeJsonLd } from "../../../lib/seo/home";
import { jsonLdText } from "../../../lib/seo/product";
import { HERO_IMAGE, SHELL_PREFETCH, siteText } from "../../../lib/site";
import { siteOrigin } from "../../../lib/site-origin";
import { HOME_CATEGORIES, NEW_ARRIVALS, toHomePage } from "../../../lib/view-models/home";
import { toProductCard } from "../../../lib/view-models/product";

// D58 (T51): the market's home, in the static shell. Every read is a `cached()` entry (the
// categories under `navigation`, the searches under `search`, the products under
// `medusa:products`), so the route is `ensureStatic = "navigation"`: a `cookies()`, a
// `connection()` or an uncached read anywhere in it fails the build. The hero's words and picture
// are the shop's (`site.ts`) until M4's `hero` block; the categories, their pictures and the new
// arrivals are Medusa's.
//
// T61: the home is where the `header`, `footer` and `site-settings` globals are previewed (live
// preview's frame, D74), so in Draft Mode it renders live preview's island, which redraws the frame
// when the editor saves. A published home never renders it, and its code loads only when it does.
//
// T65 (D80): the page `site-settings.homepage` names, drawn with the CMS page template when it is
// set and published (in Draft Mode, the editor's latest version); otherwise, and with no database
// (`readHomepage` is `null`, D10's stand-in), M3's home template as before. The seed's "Home" draws
// the same sections in the same order as M3's.

export const ensureStatic = "navigation";

type HomeData = { context: MarketContext; messages: Awaited<ReturnType<typeof getMessages>> };

/** The market, or `null` for a market without a region (a 404). Shared by the page and metadata. */
const readHome = cache(async (): Promise<HomeData | null> => {
  // The stand-in (no Medusa, D10) has no region to read: the home is a 404 there, as a listing is.
  if (!buildReadsMedusa()) return null;
  const market = await getCurrentMarket();
  const [context, messages] = await Promise.all([getMarketContext(market.key), getMessages()]);
  return context === null ? null : { context, messages };
});

/** The newest products as cards, newest first. */
async function readNewArrivals(context: MarketContext) {
  const { market, region } = context;
  const result = await searchProducts({
    locale: market.medusaLocale,
    currencyCode: region.currencyCode,
    query: "",
    filters: {},
    sort: "newest",
    page: 1,
    pageSize: NEW_ARRIVALS,
  });
  if (result.ids.length === 0) return [];
  const products = await listProductsByIds(result.ids, {
    regionId: region.id,
    locale: market.medusaLocale,
  });
  return products.flatMap((product) => toProductCard(product, context.hrefs) ?? []);
}

export async function generateMetadata(): Promise<Metadata> {
  const [{ isEnabled: draft }, market] = await Promise.all([draftMode(), getCurrentMarket()]);
  const [homepage, data] = await Promise.all([readHomepage({ market, draft }), readHome()]);
  if (homepage === null && data === null) return {};
  // The store's name is the site settings' (T61), as the layout's title and the header have it.
  const { settings, url, map } = await getShellData();
  const href = url("/");
  const text = siteText(market.language);
  return {
    // The layout's default title, the store's name, is the home's.
    description: text.hero.text,
    alternates: { canonical: href, languages: hreflangAlternates("/", map) },
    openGraph: { type: "website", title: settings.storeName, url: href },
  };
}

/** The home's `WebSite` JSON-LD: the store's name, its home and its search. */
function HomeJsonLd({
  storeName,
  url,
  language,
}: {
  storeName: string;
  url: (path: string) => string;
  language: string;
}) {
  return (
    <script
      type="application/ld+json"
      // The store's name and the market's URLs, escaped by `jsonLdText` all the same.
      dangerouslySetInnerHTML={{
        __html: jsonLdText(
          homeJsonLd({
            storeName,
            homeHref: url("/"),
            searchHref: url("/search"),
            language,
          }),
        ),
      }}
    />
  );
}

export default async function MarketHome() {
  const [{ isEnabled: draft }, current] = await Promise.all([draftMode(), getCurrentMarket()]);
  const homepage = await readHomepage({ market: current, draft });
  if (homepage !== null) {
    const { settings, url } = await getShellData();
    // The homepage is the market's home: no breadcrumbs, whatever its parent.
    const { breadcrumbs: _none, ...content } = cmsPageContent(
      homepage,
      { byPath: {}, byId: {} },
      { home: "", url },
    );
    return (
      <>
        <HomeJsonLd storeName={settings.storeName} url={url} language={current.htmlLang} />
        <CmsPageView page={homepage} content={content} market={current} draft={draft} />
      </>
    );
  }
  const data = await readHome();
  if (data === null) notFound();
  const { context, messages } = data;
  const { market } = context;
  const { settings } = await getShellData();
  const tree = (await listCategories(market.medusaLocale)).slice(0, HOME_CATEGORIES);
  const reads = catalogReads(context);
  const [pictures, newArrivals] = await Promise.all([
    // A tile's picture is its newest product's (its children's included); T64's showcase shares it.
    Promise.all(
      tree.map((node) =>
        categoryPicture(
          reads,
          flattenCategories([node]).map((each) => each.id),
        ),
      ),
    ),
    readNewArrivals(context),
  ]);
  const text = siteText(market.language);
  const content = toHomePage({
    hero: { ...text.hero, image: HERO_IMAGE },
    categories: tree.map((node, index) => {
      const image = pictures[index];
      return {
        label: node.name,
        href: context.hrefs.category(node.handle),
        ...(image === undefined ? {} : { image }),
      };
    }),
    newArrivals,
    copy: messages.templates.home,
    storeHref: context.url("/store"),
  });
  return (
    <>
      <HomeJsonLd storeName={settings.storeName} url={context.url} language={market.htmlLang} />
      <HomeTemplate
        {...content}
        copy={homeCopy(messages)}
        locale={market.htmlLang}
        prefetch={SHELL_PREFETCH}
      />
      {draft ? <RefreshOnSave serverURL={siteOrigin()} /> : null}
    </>
  );
}
