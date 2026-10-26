import type {
  ErrorPage,
  HomePage,
  ListingResults,
  NotFoundPage,
  ProductDetailPage,
  ProductListingPage,
  QueryParam,
  SearchResultsPage,
  SortState,
} from "@shopblok/registry/contracts";
import { commerceFixtures } from "../commerce";
import { copies } from "../commerce/copy";
import { fixtureImage } from "../commerce/images";
import type { DesignSystemLocale } from "../design-system";

// The templates' page-level fixtures (D56, T48): what each template shows between the header and
// the footer, in each DS locale. The DS draws a template inside the classic header and the
// multi-column footer of the commerce fixtures (`commerceFixtures[locale].header`, `.footer`), so the
// links are that market's own.

export type PageFixtures = {
  /** A 404 with the home page and the search page as the ways on. */
  notFound: NotFoundPage;
  /** A 500: the home page (the retry is the page's). */
  error: ErrorPage;
  /**
   * The Heritage Hoodie's page (T49): its gallery and its buy box with nothing chosen (the default a
   * shop's server renders), the sticky bar asking for options, its information, the first page of
   * its reviews, and the listing carousel's other products as the related ones.
   */
  productDetail: ProductDetailPage;
  /**
   * The hoodie's category (T50): the first of its two pages, newest first, with the listing
   * organisms' twelve cards and filters (two chosen), and the same page with no product.
   */
  productListing: ProductListingPage;
  /** The search page for `search.query` (T50): the same results, by relevance, the query kept. */
  searchResults: SearchResultsPage;
  /**
   * The home (T51): the hero, the catalog's top-level categories with a picture each, the listing
   * carousel's products as the new arrivals, and the link to every product.
   */
  home: HomePage;
};

/** The sort as a listing offers it: newest, then by price; a search puts relevance first. */
function sortState(
  action: string,
  labels: { relevance: string; newest: string; priceAsc: string; priceDesc: string },
  selected: "relevance" | "newest",
  params: QueryParam[],
): SortState {
  const byPrice = [
    { value: "price-asc", label: labels.priceAsc },
    { value: "price-desc", label: labels.priceDesc },
  ];
  const newest = { value: "newest", label: labels.newest };
  return {
    action,
    name: "sort",
    options:
      selected === "relevance"
        ? [{ value: "relevance", label: labels.relevance }, newest, ...byPrice]
        : [newest, ...byPrice],
    selected,
    params,
  };
}

function pagesFor(locale: DesignSystemLocale): PageFixtures {
  const { header, product, productPage, listing, categories } = commerceFixtures[locale];
  const related = listing.carousel.products.filter((card) => card.id !== product.id);
  const copy = copies[locale];
  const searchHref = listing.search.idle.search.action;
  // The hoodie's own category is the listing: its trail up to it, and its name.
  const category = product.breadcrumbs.at(-1) ?? { label: product.title, href: product.href };
  const trail = product.breadcrumbs.slice(0, -1);
  // The filter form lands on the search page with the listing named (D59), as the shop's does.
  const scope = { name: "scope", value: "category:hoodies" };
  const results = (selected: "relevance" | "newest", params: QueryParam[]): ListingResults => ({
    toolbar: {
      count: listing.filters.resultCount,
      sort: sortState(searchHref, copy.listingPage.sort, selected, params),
    },
    filters: { ...listing.filters, action: searchHref, params },
    grid: listing.grid.products,
    page: { page: 1, pageCount: 2 },
  });
  const query = listing.search.results.search.query;
  const storeHref = `${header.content.homeHref.replace(/\/$/, "")}/store`;
  return {
    notFound: {
      homeHref: header.content.homeHref,
      ...(header.content.utilities.search === undefined
        ? {}
        : { searchHref: header.content.utilities.search }),
    },
    error: { homeHref: header.content.homeHref },
    productDetail: {
      variant: "default",
      breadcrumbs: { trail: product.breadcrumbs, current: product.title },
      gallery: productPage.gallery.all,
      buyBox: productPage.buyBox.empty,
      sticky: productPage.sticky.incomplete,
      info: productPage.info,
      reviews: productPage.reviews.first,
      related: {
        title: copies[locale].productPage.related,
        products: related,
        variant: "standard",
      },
    },
    productListing: {
      variant: "default",
      breadcrumbs: { trail: trail.length > 0 ? trail : [category], current: category.label },
      title: category.label,
      results: results("newest", [scope]),
    },
    searchResults: {
      variant: "default",
      search: { action: searchHref, query },
      title: copy.listingPage.resultsFor,
      results: results("relevance", [{ name: "q", value: query }]),
    },
    home: {
      variant: "default",
      hero: {
        title: copy.homePage.hero.title,
        text: copy.homePage.hero.text,
        image: fixtureImage({ seed: 21, ratio: "16:9", alt: "" }),
        action: { label: copy.homePage.hero.action, href: storeHref },
      },
      categories: {
        title: copy.homePage.categories,
        items: categories.slice(0, 8).map((category, index) => ({
          label: category.title,
          href: category.href,
          // Decorative: the tile's name says where it goes.
          image: fixtureImage({ seed: 30 + index, ratio: "3:4", alt: "" }),
        })),
      },
      newArrivals: {
        title: copy.homePage.newArrivals,
        products: listing.carousel.products,
        variant: "standard",
        viewAll: { label: copy.homePage.seeAllNew, href: `${storeHref}?sort=newest` },
      },
      shopAll: { label: copy.homePage.shopAll, href: storeHref },
    },
  };
}

/** Each DS locale's page fixtures. */
export const pageFixtures: Record<DesignSystemLocale, PageFixtures> = {
  en: pagesFor("en"),
  el: pagesFor("el"),
  de: pagesFor("de"),
  fr: pagesFor("fr"),
};
