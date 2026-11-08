import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n";
import type { ListingResults } from "@shopblok/registry/contracts";
import { ProductListingTemplate, productListingCopy } from "@shopblok/ui/templates/product-listing";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { cache, Suspense } from "react";
import { readCategoryContent, readCollectionContent } from "../../lib/cms/catalog";
import type { ListingContent } from "../../lib/cms/catalog-content";
import { cmsOrNull, type CmsReader } from "../../lib/cms/read";
import { shellPaths } from "../../lib/cms/shell";
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
  pathPage,
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
import { withSeo } from "../../lib/seo/meta";
import { jsonLdText } from "../../lib/seo/product";
import { SHELL_PREFETCH } from "../../lib/site";
import { catalogSections } from "../cms/catalog-sections";
import { CmsRichText } from "../cms/rich-text";
import { getShellData } from "../shell/shell-data";
import { ListingIsland } from "./listing-island";

// D59 (T50): the listing pages' one server part. `{m}/store`, `{m}/categories/[...handle]` and
// `{m}/collections/[handle]` (each with its `page/[n]`) render this with their scope and the page
// from the path, under `ensureStatic = "navigation"`: the first page of a listing, with no filter,
// from `cached()` reads, so every page is in the static shell, self-canonical and crawlable. A page
// past the last is `notFound()`, before any `Suspense`. The filters and the sort are the island's
// (`listing-island.tsx`): it is drawn beside the server's results, in its own `Suspense` with no
// fallback, and does nothing for a URL without them.
// T69 (D83): a category's or collection's banner and introduction from its Payload document, read
// by its handle in the market's language, on every page of the listing; none for the store, and
// none without a database or before the sync has written the document.
// T87 (D104): its sections after the results and their pagination, on every page of the listing.

type ListingPageData = {
  context: MarketContext;
  messages: Messages;
  resolved: ResolvedScope;
  results: ListingResults;
  page: number;
  pageSize: number;
  /** The category's or collection's content (T69); `null` for the store or without one. */
  content: ListingContent | null;
  /** Draft Mode is on (an editor's preview). */
  draft: boolean;
};

/**
 * The scope's Payload document: a category's (by its last handle) or a collection's; `null` for
 * the store, which is no document's. The content (T69) and the sections (T87) read the same one.
 */
function scopeDocument(
  scope: ListingScope,
): { kind: "categories" | "collections"; handle: string } | null {
  if (scope.kind === "category") return { kind: "categories", handle: scope.path.at(-1) ?? "" };
  if (scope.kind === "collection") return { kind: "collections", handle: scope.handle };
  return null;
}

/** The scope's Payload document's content (`scopeDocument`). */
function readScopeContent(reader: CmsReader, scope: ListingScope) {
  const owner = scopeDocument(scope);
  const read =
    owner === null
      ? Promise.resolve(null)
      : owner.kind === "categories"
        ? readCategoryContent(reader, owner.handle)
        : readCollectionContent(reader, owner.handle);
  return cmsOrNull(read, "listing page: no banner or introduction");
}

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
    const [market, { isEnabled: draft }] = await Promise.all([getCurrentMarket(), draftMode()]);
    const [context, messages] = await Promise.all([getMarketContext(market.key), getMessages()]);
    if (context === null) return null;
    const resolved = await resolveScope(context, messages, scope);
    if (resolved === null) return null;
    const pageSize = listingPageSize();
    const contentRead = readScopeContent({ market, draft }, scope);
    // D101 (T84): the grid's card from the `templates` global, read in the shell as the layout is.
    const { templates } = await getShellData();
    const results = await readListing({
      card: templates.card,
      quickView: templates.quickView,
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
    const content = await contentRead;
    return { context, messages, resolved, results, page, pageSize, content, draft };
  },
);

/** The introduction, its links resolved in this market (a category's to its whole path). */
async function introText(intro: NonNullable<ListingContent["intro"]>, context: MarketContext) {
  const { categories, pages } = await getShellData();
  const paths = shellPaths(categories, pages);
  return <CmsRichText data={intro} context={{ market: context.market, map: context.map, paths }} />;
}

/**
 * A category's or collection's sections (T87, D104), on every page of its listing: its own, the
 * `templates` global's for the listings, or none. The store's page is no document's, and has none.
 */
async function scopeSections({ context, messages, resolved, draft }: ListingPageData) {
  const owner = scopeDocument(resolved.scope);
  return owner === null ? undefined : catalogSections({ owner, context, messages, draft });
}

/** The address of a page of the listing: the first at the listing's own, the others by path. */
const pageHref = (base: string, page: number) => (page === 1 ? base : `${base}/page/${page}`);

/** The key of a listing for `readListingPage`: empty, a 404, for a scope the URL did not make. */
const keyOf = (scope: ListingScope | null) => (scope === null ? "" : scopeValue(scope));

export async function listingMetadata(
  scope: ListingScope | null,
  page: number | null,
): Promise<Metadata> {
  const data = await readListingPage(keyOf(scope), page);
  // As the page's: a missing one's metadata is then the not-found file's (its tab title, T78).
  if (data === null) notFound();
  const { context, messages, resolved, content } = data;
  const { settings } = await getShellData();
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
  // D82: the category's or collection's own SEO fields (T69's content) first, its title on the
  // first page only (a later page keeps its number), then the listing's, then the site's.
  const meta = content?.meta;
  const own = data.page === 1 || meta === undefined ? meta : { ...meta, title: undefined };
  return withSeo(
    {
      title,
      alternates: {
        // SPEC §12: a listing's pages are self-canonical; a filtered or sorted URL points here too.
        canonical: href,
        languages: hreflangAlternates(path, context.map),
      },
      openGraph: { type: "website", title, url: href },
    },
    own,
    settings.seo,
  );
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
  const { context, messages, resolved, results, content } = data;
  const { market } = context;
  const base = context.url(resolved.path);
  const [intro, sections] = await Promise.all([
    content?.intro == null ? undefined : introText(content.intro, context),
    scopeSections(data),
  ]);
  // D101: the `templates` global's filter layout, read in the shell like the header (T79).
  const { templates } = await getShellData();
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
        variant={templates.listing}
        breadcrumbs={breadcrumbs}
        title={resolved.title}
        {...(content?.banner === undefined ? {} : { banner: content.banner })}
        results={results}
        copy={copy}
        locale={market.htmlLang}
        hrefFor={(n) => pageHref(base, n)}
        prefetch={SHELL_PREFETCH}
        slots={{
          ...(intro === undefined ? {} : { intro }),
          ...(sections === undefined ? {} : { sections }),
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
                layout={templates.listing}
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
