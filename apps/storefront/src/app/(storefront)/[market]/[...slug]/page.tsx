import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { cache } from "react";
import { CmsPageView } from "../../../../components/cms/cms-page-view";
import { getShellData } from "../../../../components/shell/shell-data";
import { cmsPageContent } from "../../../../lib/cms/page-content";
import { encodePagePath, pathFromSegments } from "../../../../lib/cms/page-path";
import {
  pageAddresses,
  readHomepageId,
  readPageByPath,
  readPagePaths,
} from "../../../../lib/cms/pages";
import { getCurrentMarket } from "../../../../lib/current-market";
import { getMarketMap } from "../../../../lib/markets/get-market-map";
import { hreflangAlternates } from "../../../../lib/markets/hreflang";
import { findMarket, listMarkets } from "../../../../lib/markets/market";
import { PLACEHOLDER_HANDLE, prerenderCap } from "../../../../lib/prerender";
import { withSeo } from "../../../../lib/seo/meta";
import { cmsPageJsonLd } from "../../../../lib/seo/page";
import { jsonLdText } from "../../../../lib/seo/product";

// D80 (T65): an editor's page at its address in the market's language (`/about/team`, the
// parents' slugs and its own), in the static shell. Every read is a `cached()` entry (the pages'
// addresses and the page under `pages:<locale>`, the shell's, the commerce blocks' catalog reads),
// so the route is `ensureStatic = "navigation"`: a `searchParams`, a `cookies()` or an uncached
// read anywhere in it fails the build. `notFound()` is called before any `Suspense`, so an address
// with no published page is a real 404. A page that opens with a hero gives the hero its `<h1>`.
// T68 (D82): its SEO fields in the metadata, and a `WebPage` with its `BreadcrumbList` as JSON-LD.
// In Draft Mode (live preview, D74) it reads the editor's latest versions and renders the island
// that redraws the frame on save.

export const ensureStatic = "navigation";
// W5: no instant-navigation check for a page that reads its path first (SETUP.md, "W5 fixes").
export const instant = false;

type Params = { market: string; slug: string[] };
type Props = { params: Promise<Params> };

/**
 * D58: the published pages' addresses in the market's language, up to the PDPs' cap
 * (`STOREFRONT_PRERENDER_PRODUCTS`); the rest render on their first request. With no database (or
 * no page) the build renders one placeholder, which the page answers with a 404 before reading.
 */
export async function generateStaticParams({
  params,
}: {
  params: Pick<Params, "market">;
}): Promise<Pick<Params, "slug">[]> {
  const placeholder = [{ slug: [PLACEHOLDER_HANDLE] }];
  const cap = prerenderCap();
  const market = findMarket(await getMarketMap(), params.market);
  if (market === undefined || cap === 0) return placeholder;
  const paths = await readPagePaths({ market, draft: false });
  const addresses = Object.keys(paths?.byPath ?? {}).slice(0, cap);
  return addresses.length === 0
    ? placeholder
    : addresses.map((path) => ({ slug: path.split("/").slice(1) }));
}

/** The page at the address and its market, or `null` for a 404. Shared by the page and metadata. */
const readPage = cache(async (segments: readonly string[], draft: boolean) => {
  if (segments[0] === PLACEHOLDER_HANDLE) return null;
  const path = pathFromSegments(segments);
  if (path === null) return null;
  const market = await getCurrentMarket();
  const found = await readPageByPath({ market, draft }, path);
  return found === null ? null : { market, path, ...found };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, { isEnabled: draft }] = await Promise.all([params, draftMode()]);
  const data = await readPage(slug, draft);
  if (data === null) return {};
  const { market, page, path } = data;
  const { map, url, settings } = await getShellData();
  const languages = [...new Set(listMarkets(map).map((each) => each.language))];
  const [addresses, homepage] = await Promise.all([
    pageAddresses(page.id, languages),
    readHomepageId({ market, draft: false }),
  ]);
  // The homepage's own address points at the market's home, where `{m}/` draws it (D80).
  const isHomepage = page.id === homepage;
  // D82: the page's own SEO fields first, then its title, then the site's description and picture.
  return withSeo(
    {
      title: page.title,
      alternates: {
        canonical: url(isHomepage ? "/" : encodePagePath(path)),
        // D80: every open market, at the page's address in its language.
        languages: isHomepage
          ? hreflangAlternates("/", map)
          : hreflangAlternates((each) => {
              const address = addresses[each.language];
              return address === undefined ? null : encodePagePath(address);
            }, map),
      },
      openGraph: { type: "website", title: page.title, url: url(encodePagePath(path)) },
    },
    page.meta,
    settings.seo,
  );
}

export default async function CmsPageRoute({ params }: Props) {
  const [{ slug }, { isEnabled: draft }] = await Promise.all([params, draftMode()]);
  const data = await readPage(slug, draft);
  if (data === null) notFound();
  const { market, page, paths } = data;
  const { url } = await getShellData();
  const messages = await getMessages();
  const home = messages.templates.productDetail.home;
  const content = cmsPageContent(page, paths, { home, url });
  const href = url(encodePagePath(data.path));
  // A top-level page shows no breadcrumbs, but its `BreadcrumbList` still starts at Home.
  const breadcrumbs = content.breadcrumbs ?? {
    trail: [{ label: home, href: url("/") }],
    current: page.title,
  };
  return (
    <>
      <script
        type="application/ld+json"
        // The pages' titles, escaped by `jsonLdText` so they cannot close the element.
        dangerouslySetInnerHTML={{
          __html: jsonLdText(
            cmsPageJsonLd({
              title: page.title,
              href,
              language: market.htmlLang,
              breadcrumbs,
              ...(page.meta.description === undefined
                ? {}
                : { description: page.meta.description }),
            }),
          ),
        }}
      />
      <CmsPageView page={page} content={content} market={market} paths={paths} draft={draft} />
    </>
  );
}
