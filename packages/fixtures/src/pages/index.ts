import type { ErrorPage, NotFoundPage, ProductDetailPage } from "@shopblok/registry/contracts";
import { commerceFixtures } from "../commerce";
import { copies } from "../commerce/copy";
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
};

function pagesFor(locale: DesignSystemLocale): PageFixtures {
  const { header, product, productPage, listing } = commerceFixtures[locale];
  const related = listing.carousel.products.filter((card) => card.id !== product.id);
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
  };
}

/** Each DS locale's page fixtures. */
export const pageFixtures: Record<DesignSystemLocale, PageFixtures> = {
  en: pagesFor("en"),
  el: pagesFor("el"),
  de: pagesFor("de"),
  fr: pagesFor("fr"),
};
