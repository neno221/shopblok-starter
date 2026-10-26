// Ours (T48, SETUP.md "The shell (T48)"; D56, D45, D51). The stories of the templates: a page's
// content between the header and the footer, which the layout draws. The live render is the page:
// the template inside the classic header and the multi-column footer of the commerce fixtures, so
// the picture is what a shopper sees, with the template's content from `pageFixtures[ctx.locale]`
// and its words from `catalogs[ctx.locale].templates`. The states draw the template alone. The DS
// frame is the page's `<main>`, so a template is drawn as a `div` here (`as="div"`) with an id of
// its own, which the live header's skip link targets. Every link is drawn with `prefetch={false}`.
import { commerceFixtures, pageFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import { Button } from "@shopblok/ui/atoms/button";
import { FooterMultiColumn } from "@shopblok/ui/organisms/footer/multi-column";
import { HeaderClassic } from "@shopblok/ui/organisms/header/classic";
import { ErrorTemplate } from "@shopblok/ui/templates/error";
import { HomeTemplate, homeCopy } from "@shopblok/ui/templates/home";
import { NotFoundTemplate } from "@shopblok/ui/templates/not-found";
import {
  ProductDetailTemplate,
  productDetailCopy,
  type ProductDetailIds,
} from "@shopblok/ui/templates/product-detail";
import { ProductListingTemplate, productListingCopy } from "@shopblok/ui/templates/product-listing";
import { SearchResultsTemplate, searchResultsCopy } from "@shopblok/ui/templates/search-results";
import type { ProductDetailPage, ProductListingPage } from "@shopblok/registry/contracts";
import type { ReactNode } from "react";
import type { DsContext, DsStory } from "../types";

const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

/** The page around a template: the fixtures' classic header and multi-column footer. */
function page(ctx: DsContext, mainId: string, content: ReactNode) {
  const { header, footer } = commerceFixtures[ctx.locale];
  const catalog = catalogs[ctx.locale];
  return (
    <div className="flex flex-col">
      <HeaderClassic
        {...header.content}
        copy={catalog.organisms}
        marketSwitcherCopy={catalog.molecules.marketSwitcher}
        locale={lang(ctx)}
        prefetch={false}
        mainId={mainId}
        sticky={false}
      />
      {content}
      <FooterMultiColumn
        {...footer.content}
        copy={catalog.organisms.footer}
        newsletterCopy={catalog.molecules.newsletterForm}
        marketSwitcherCopy={catalog.molecules.marketSwitcher}
        locale={lang(ctx)}
        prefetch={false}
      />
    </div>
  );
}

const notFound = (ctx: DsContext, mainId: string, over: { searchHref?: string | null } = {}) => {
  const { searchHref, ...fixture } = pageFixtures[ctx.locale].notFound;
  const search = over.searchHref === null ? undefined : (over.searchHref ?? searchHref);
  return (
    <NotFoundTemplate
      {...fixture}
      {...(search === undefined ? {} : { searchHref: search })}
      copy={catalogs[ctx.locale].templates.notFound}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
};

const error = (ctx: DsContext, mainId: string, retry: boolean) => (
  <ErrorTemplate
    {...pageFixtures[ctx.locale].error}
    copy={catalogs[ctx.locale].templates.error}
    {...(retry
      ? {
          retry: (
            <Button size="lg" data-slot="error-retry">
              {catalogs[ctx.locale].templates.error.retry}
            </Button>
          ),
        }
      : {})}
    prefetch={false}
    as="div"
    mainId={mainId}
  />
);

/** A state's own ids, so two product pages on one DS page link nothing of each other's. */
const idsFor = (prefix: string): ProductDetailIds => ({
  form: `${prefix}-buy-box`,
  options: `${prefix}-buy-box-options`,
  button: `${prefix}-buy-box-add`,
  title: `${prefix}-title`,
  reviews: `${prefix}-reviews`,
});

type ProductDetailVariant = "default" | "chosen" | "long" | "no-related";

/** The fixture's product page, changed for a state. */
function productDetailContent(ctx: DsContext, state: ProductDetailVariant): ProductDetailPage {
  const base = pageFixtures[ctx.locale].productDetail;
  const fixtures = commerceFixtures[ctx.locale];
  if (state === "chosen") {
    const { productPage } = fixtures;
    return {
      ...base,
      gallery: productPage.gallery.chosen,
      buyBox: productPage.buyBox.ready,
      sticky: productPage.sticky.ready,
    };
  }
  if (state === "long") {
    const title = fixtures.long.product.title;
    return {
      ...base,
      breadcrumbs: { ...base.breadcrumbs, current: title },
      gallery: { ...base.gallery, title },
      buyBox: { ...base.buyBox, product: { ...base.buyBox.product, title } },
      sticky: { ...base.sticky, title },
    };
  }
  if (state === "no-related") {
    const { related: _related, ...rest } = base;
    return rest;
  }
  return base;
}

const productDetail = (ctx: DsContext, mainId: string, state: ProductDetailVariant) => {
  const content = productDetailContent(ctx, state);
  const href = content.buyBox.product.href;
  return (
    <ProductDetailTemplate
      {...content}
      copy={productDetailCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      reviewsHrefFor={(n) => (n === 1 ? href : `${href}?reviews=${n}`)}
      ids={idsFor(mainId)}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
};

type ProductListingVariant = "default" | "no-filters" | "empty";

/** The fixture's listing page, changed for a state. */
function productListingContent(ctx: DsContext, state: ProductListingVariant): ProductListingPage {
  const base = pageFixtures[ctx.locale].productListing;
  const { listing } = commerceFixtures[ctx.locale];
  if (state === "no-filters") {
    const { filters: _filters, ...results } = base.results;
    return { ...base, results };
  }
  if (state === "empty") {
    const { filters: _filters, ...results } = base.results;
    return {
      ...base,
      results: {
        ...results,
        toolbar: { ...results.toolbar, count: 0 },
        grid: listing.grid.empty,
        page: { page: 1, pageCount: 1 },
      },
    };
  }
  return base;
}

/** A page of the listing: the first at its own address, the others by path (D59). */
const listingHrefFor = (base: string) => (n: number) => (n === 1 ? base : `${base}/page/${n}`);

const productListing = (ctx: DsContext, mainId: string, state: ProductListingVariant) => {
  const content = productListingContent(ctx, state);
  const base = content.breadcrumbs.trail.at(-1)?.href ?? "/";
  return (
    <ProductListingTemplate
      {...content}
      copy={productListingCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      hrefFor={listingHrefFor(base)}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
};

const searchResults = (ctx: DsContext, mainId: string, empty: boolean) => {
  const base = pageFixtures[ctx.locale].searchResults;
  const { listing } = commerceFixtures[ctx.locale];
  const { filters: _filters, ...unfiltered } = base.results;
  const content = empty
    ? {
        ...base,
        results: {
          ...unfiltered,
          toolbar: { ...unfiltered.toolbar, count: 0 },
          grid: listing.grid.empty,
          page: { page: 1, pageCount: 1 },
        },
      }
    : base;
  const action = content.search.action;
  const query = encodeURIComponent(content.search.query);
  return (
    <SearchResultsTemplate
      {...content}
      copy={searchResultsCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      hrefFor={(n) => (n === 1 ? `${action}?q=${query}` : `${action}?q=${query}&page=${n}`)}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
};

const home = (ctx: DsContext, mainId: string, variant: "default" | "bare") => {
  const { categories, newArrivals, ...base } = pageFixtures[ctx.locale].home;
  const content = variant === "bare" ? base : { ...base, categories, newArrivals };
  return (
    <HomeTemplate
      {...content}
      copy={homeCopy(catalogs[ctx.locale])}
      locale={lang(ctx)}
      prefetch={false}
      as="div"
      mainId={mainId}
    />
  );
};

const pageNote =
  "The template is the page between the header and the footer: in a shop it is the page's one `<main>`, the skip link's target, with the page's only `<h1>`. The icon is decoration and hidden from assistive technology.";
const waysNote =
  "The ways on are links drawn as buttons, at least 44 px tall, in reading order: the first is the primary one. Long words wrap and are never cut.";

export const templateStories = {
  "templates/not-found": {
    summary:
      "The 404 page: “Page not found”, a sentence, and the home page and the search page as the ways on.",
    a11y: [
      pageNote,
      waysNote,
      "Next answers the page with the 404 status, so a crawler drops it; the words are the catalog's in the market's language.",
    ],
    live: (ctx) => page(ctx, "template-not-found", notFound(ctx, "template-not-found")),
    states: [
      {
        id: "default",
        label: "Default",
        description: "The home page and the search page.",
        render: (ctx) => notFound(ctx, "template-not-found-default"),
      },
      {
        id: "no-search",
        label: "Without search",
        description: "A shop with no search page: the home page is the only way on.",
        render: (ctx) => notFound(ctx, "template-not-found-no-search", { searchHref: null }),
      },
    ],
    statesLayout: "stack",
  },
  "templates/error": {
    summary:
      "The error page: “Something went wrong”, a sentence that says what to do, “Try again” and the home page.",
    a11y: [
      pageNote,
      waysNote,
      "The page says nothing about the error: a server error's message never reaches the browser, and its digest means nothing to a shopper. “Try again” is a button (the error boundary's retry), and the home page a link.",
    ],
    live: (ctx) => page(ctx, "template-error", error(ctx, "template-error", true)),
    states: [
      {
        id: "default",
        label: "With “Try again”",
        description: "The error boundary's retry, then the home page.",
        render: (ctx) => error(ctx, "template-error-default", true),
      },
      {
        id: "no-retry",
        label: "Without “Try again”",
        description: "Where nothing can be retried, the home page is the primary button.",
        render: (ctx) => error(ctx, "template-error-no-retry", false),
      },
    ],
    statesLayout: "stack",
  },
  "templates/product-detail": {
    summary:
      "The product page: the breadcrumbs, the gallery beside the buy box from `md`, the information, the reviews and the related products. In a shop the buy box and the gallery follow `?variant=` through islands; the server draws this, the default choice.",
    a11y: [
      pageNote,
      "The product's name is the page's one `<h1>`, in the buy box; every section under it has an `<h2>`. The buy box's rating links to the reviews, and the sticky bar's button submits the buy box's form, so both add the same choice.",
      "One column below `md`, in reading order: the pictures, the buy box, the information, the reviews, the related products. From `md` the buy box sticks under the header while the pictures scroll, and its order in the page is unchanged.",
    ],
    live: (ctx) =>
      page(
        ctx,
        "template-product-detail",
        productDetail(ctx, "template-product-detail", "default"),
      ),
    states: [
      {
        id: "default",
        label: "Nothing chosen",
        description: "What the server renders: the buy box asks for a colour and a size.",
        render: (ctx) => productDetail(ctx, "template-product-detail-default", "default"),
      },
      {
        id: "chosen",
        label: "A variant chosen",
        description:
          "`?variant=` named a colour and a size: its picture first, its price, “Add to cart”.",
        render: (ctx) => productDetail(ctx, "template-product-detail-chosen", "chosen"),
      },
      {
        id: "long",
        label: "Long name",
        description: "The longest name the copy allows wraps in the breadcrumbs and the title.",
        render: (ctx) => productDetail(ctx, "template-product-detail-long", "long"),
      },
      {
        id: "no-related",
        label: "No related products",
        description: "A product alone in its category: no carousel.",
        render: (ctx) => productDetail(ctx, "template-product-detail-no-related", "no-related"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/product-listing": {
    summary:
      "A listing page (a category, a collection, every product): the breadcrumbs, its name, the filters beside the products from `lg` (a drawer below it), the toolbar with the count and the sort, the grid and the pages, which are paths (`/page/2`). In a shop the listing island draws the results again for a URL with filters (D59); the server draws this, the first page.",
    a11y: [
      pageNote,
      "The page's name is its one `<h1>`; the filters' heading and the cards' titles are `<h2>`s. The filters are one GET form named by its heading, applied with one button, so ticking a box never reloads the page under the hand (WCAG 3.2.2).",
      "The pages and the chosen filters are links (`<a href>`), so a crawler and a visitor without JavaScript reach every page. Without JavaScript the filter and sort forms land on the search page, which applies them on the server.",
    ],
    live: (ctx) =>
      page(
        ctx,
        "template-product-listing",
        productListing(ctx, "template-product-listing", "default"),
      ),
    states: [
      {
        id: "default",
        label: "Filters chosen",
        description: "The first of two pages, two filters chosen, newest first.",
        render: (ctx) => productListing(ctx, "template-product-listing-default", "default"),
      },
      {
        id: "no-filters",
        label: "Nothing to filter",
        description:
          "No product has anything to filter by: no sidebar, and the grid takes the width.",
        render: (ctx) => productListing(ctx, "template-product-listing-no-filters", "no-filters"),
      },
      {
        id: "empty",
        label: "No products",
        description: "A category with no products yet: the empty state, and no pages.",
        render: (ctx) => productListing(ctx, "template-product-listing-empty", "empty"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/home": {
    summary:
      "The home page: the hero (a line, the way into the shop and a picture), the top-level categories as tiles, the newest products as a carousel and a link to every product. The hero's words are the shop's until M4's hero block; the rest is read from Medusa.",
    a11y: [
      pageNote,
      "The hero's title is the page's one `<h1>`; the categories and the new arrivals each have an `<h2>` that names their section. A category tile is one link, its name and picture together; the picture is decoration (`alt=\"\"`), so the link's name is the category's.",
      "The hero's picture is preloaded (it is the first screen's largest). Below `md` the hero is one column, the words before the picture.",
    ],
    live: (ctx) => page(ctx, "template-home", home(ctx, "template-home", "default")),
    states: [
      {
        id: "default",
        label: "Default",
        description: "The hero, the categories, the new arrivals and the link to every product.",
        render: (ctx) => home(ctx, "template-home-default", "default"),
      },
      {
        id: "bare",
        label: "An empty shop",
        description:
          "No categories and no products yet: the hero and the link to every product only.",
        render: (ctx) => home(ctx, "template-home-bare", "bare"),
      },
    ],
    statesLayout: "stack",
  },
  "templates/search-results": {
    summary:
      "The search page: the search field with the query, a heading that says what was searched, then the same results as a listing's, every filter and sort read on the server (it is dynamic). A listing's filter form lands here without JavaScript (D59).",
    a11y: [
      pageNote,
      "The search field is a `search` landmark with a GET form of its own, so a new query starts without the last one's filters. The heading says what was searched; the results are a listing's, with the same headings and forms.",
    ],
    live: (ctx) =>
      page(ctx, "template-search-results", searchResults(ctx, "template-search-results", false)),
    states: [
      {
        id: "default",
        label: "Results",
        description: "The query's results, by relevance.",
        render: (ctx) => searchResults(ctx, "template-search-results-default", false),
      },
      {
        id: "empty",
        label: "No results",
        description: "A query that finds nothing: the empty state, no filters and no pages.",
        render: (ctx) => searchResults(ctx, "template-search-results-empty", true),
      },
    ],
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
