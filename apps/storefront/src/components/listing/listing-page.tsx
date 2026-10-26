import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n";
import type { ListingResults } from "@shopblok/registry/contracts";
import { ProductListingTemplate, productListingCopy } from "@shopblok/ui/templates/product-listing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { cache, Suspense } from "react";
import { getCurrentMarket } from "../../lib/current-market";
import {
  listingBreadcrumbs,
  listingPageSize,
  readListing,
  resolveScope,
  scopeField,
  type ResolvedScope,
} from "../../lib/listing/listing";
import {
  categoryScope,
  pageOf,
  parseListingQuery,
  parseScope,
  scopeValue,
  type ListingScope,
} from "../../lib/listing/query";
import { getMarketContext, type MarketContext } from "../../lib/market-context";
import { hreflangAlternates } from "../../lib/markets/hreflang";
import { categoryPaths, listCategories } from "../../lib/medusa/categories";
import { listCollections } from "../../lib/medusa/collections";
import { buildReadsMedusa, PLACEHOLDER_HANDLE } from "../../lib/prerender";
import { listingJsonLd } from "../../lib/seo/listing";
import { jsonLdText } from "../../lib/seo/product";
import { SHELL_PREFETCH } from "../../lib/site";
import { ListingIsland } from "./listing-island";

// D59 (T50): the listing pages' one server part. `{m}/store`, `{m}/categories/[...handle]` and
// `{m}/collections/[handle]` (each with its `page/[n]`) render this with their scope and the page
// from the path, under `ensureStatic = "navigation"`: the first page of a listing, with no filter,
// from `cached()` reads, so every page is in the static shell, self-canonical and crawlable. A page
// past the last is `notFound()`, before any `Suspense`. The filters and the sort are the island's
// (`listing-island.tsx`): it is drawn beside the server's results, in its own `Suspense` with no
// fallback, and does nothing for a URL without them.

/** A listing's page from its path segment: `/page/2` is 2; `1` and anything else is no page (404). */
export function pathPage(segment: string | undefined): number | null {
  if (segment === undefined) return 1;
  const page = pageOf(segment);
  return page !== null && page > 1 ? page : null;
}

type ListingPageData = {
  context: MarketContext;
  messages: Messages;
  resolved: ResolvedScope;
  results: ListingResults;
  page: number;
  pageSize: number;
};

/**
 * The listing's first page or `/page/n`, or `null` for a 404. Shared by the page and its metadata;
 * `cache()` keys by value, so the scope travels as its string (`parseScope` reads it back).
 */
const readListingPage = cache(
  async (scopeKey: string, page: number | null): Promise<ListingPageData | null> => {
    // The stand-in (no Medusa, D10), its placeholder and `/page/1` ask Medusa nothing: a 404.
    if (page === null || !buildReadsMedusa() || scopeKey.includes(PLACEHOLDER_HANDLE)) return null;
    const scope = parseScope(scopeKey);
    if (scope === null) return null;
    const market = await getCurrentMarket();
    const [context, messages] = await Promise.all([getMarketContext(market.key), getMessages()]);
    if (context === null) return null;
    const resolved = await resolveScope(context, messages, scope);
    if (resolved === null) return null;
    const pageSize = listingPageSize();
    const results = await readListing({
      context,
      messages,
      resolved,
      query: parseListingQuery(new URLSearchParams()),
      params: new URLSearchParams(),
      pathPage: page,
      pageSize,
      links: {
        base: { path: context.url(resolved.path), params: new URLSearchParams() },
        formAction: context.url("/search"),
        hidden: [scopeField(scope)],
      },
    });
    if (results === null) return null;
    return { context, messages, resolved, results, page, pageSize };
  },
);

/** The address of a page of the listing: the first at the listing's own, the others by path. */
const pageHref = (base: string, page: number) => (page === 1 ? base : `${base}/page/${page}`);

/** The key of a listing for `readListingPage`: empty, a 404, for a scope the URL did not make. */
const keyOf = (scope: ListingScope | null) => (scope === null ? "" : scopeValue(scope));

export async function listingMetadata(
  scope: ListingScope | null,
  page: number | null,
): Promise<Metadata> {
  const data = await readListingPage(keyOf(scope), page);
  if (data === null) return {};
  const { context, messages, resolved } = data;
  const path = pageHref(resolved.path, data.page);
  const href = context.url(path);
  const title =
    data.page === 1
      ? resolved.title
      : `${resolved.title}, ${formatMessage(
          messages.molecules.pagination.page,
          { page: data.page },
          context.market.htmlLang,
        )}`;
  return {
    title,
    alternates: {
      // SPEC §12: a listing's pages are self-canonical; a filtered or sorted URL points here too.
      canonical: href,
      languages: hreflangAlternates(path, context.map),
    },
    openGraph: { type: "website", title, url: href },
  };
}

export async function ListingPage({
  scope,
  page,
}: {
  scope: ListingScope | null;
  page: number | null;
}) {
  const data = await readListingPage(keyOf(scope), page);
  if (data === null) notFound();
  const { context, messages, resolved, results } = data;
  const { market } = context;
  const base = context.url(resolved.path);
  const copy = productListingCopy(messages);
  const breadcrumbs = listingBreadcrumbs(resolved);
  const listingCopy = messages.templates.productListing;
  return (
    <>
      <script
        type="application/ld+json"
        // Medusa's texts, escaped by `jsonLdText` so they cannot close the element.
        dangerouslySetInnerHTML={{
          __html: jsonLdText(
            listingJsonLd({
              name: resolved.title,
              href: pageHref(base, data.page),
              breadcrumbs,
              products: results.grid.products,
              firstPosition: (data.page - 1) * data.pageSize + 1,
              total: results.toolbar.count,
            }),
          ),
        }}
      />
      <ProductListingTemplate
        variant="default"
        breadcrumbs={breadcrumbs}
        title={resolved.title}
        results={results}
        copy={copy}
        locale={market.htmlLang}
        hrefFor={(n) => pageHref(base, n)}
        prefetch={SHELL_PREFETCH}
        slots={{
          // D59: beside the server's results, never around them, in a `Suspense` of its own with no
          // fallback: the static HTML holds the first page's products, and the island draws nothing
          // until the URL has a filter, a sort or a page in its query.
          island: (
            <Suspense fallback={null}>
              <ListingIsland
                market={market.key}
                scope={scopeValue(resolved.scope)}
                base={base}
                pathPage={data.page}
                action={context.url("/search")}
                copy={copy.results}
                announce={listingCopy}
                locale={market.htmlLang}
                prefetch={SHELL_PREFETCH}
              />
            </Suspense>
          ),
        }}
      />
    </>
  );
}

/**
 * D58: the build renders every category's and collection's first page with Medusa set; without it
 * (the stand-in, D10) one placeholder that answers 404, since Cache Components refuse an empty list.
 */
export async function categoryStaticParams(market: string): Promise<{ handle: string[] }[]> {
  if (!buildReadsMedusa()) return [{ handle: [PLACEHOLDER_HANDLE] }];
  const context = await getMarketContext(market);
  if (context === null) return [{ handle: [PLACEHOLDER_HANDLE] }];
  const paths = categoryPaths(await listCategories(context.market.medusaLocale));
  return paths.length === 0
    ? [{ handle: [PLACEHOLDER_HANDLE] }]
    : paths.map(({ path }) => ({ handle: path }));
}

export async function collectionStaticParams(market: string): Promise<{ handle: string }[]> {
  if (!buildReadsMedusa()) return [{ handle: PLACEHOLDER_HANDLE }];
  const context = await getMarketContext(market);
  if (context === null) return [{ handle: PLACEHOLDER_HANDLE }];
  const handles = (await listCollections(context.market.medusaLocale)).map((each) => each.handle);
  return handles.length === 0
    ? [{ handle: PLACEHOLDER_HANDLE }]
    : handles.map((handle) => ({ handle }));
}

/**
 * A category's scope and its page from the catch-all's segments (`["apparel", "page", "2"]`), as
 * Next decoded them; a segment that is no handle (`apparel%2Ftops`, a broken escape) is no scope.
 */
export function categorySegments(segments: readonly string[]): {
  scope: ListingScope | null;
  page: number | null;
} {
  if (segments.length >= 3 && segments.at(-2) === "page")
    return { scope: categoryScope(segments.slice(0, -2)), page: pathPage(segments.at(-1)) };
  return { scope: categoryScope(segments), page: 1 };
}
