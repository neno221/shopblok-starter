import type { ErrorPage, NotFoundPage } from "@shopblok/registry/contracts";
import { commerceFixtures } from "../commerce";
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
};

function pagesFor(locale: DesignSystemLocale): PageFixtures {
  const { header } = commerceFixtures[locale];
  return {
    notFound: {
      homeHref: header.content.homeHref,
      ...(header.content.utilities.search === undefined
        ? {}
        : { searchHref: header.content.utilities.search }),
    },
    error: { homeHref: header.content.homeHref },
  };
}

/** Each DS locale's page fixtures. */
export const pageFixtures: Record<DesignSystemLocale, PageFixtures> = {
  en: pagesFor("en"),
  el: pagesFor("el"),
  de: pagesFor("de"),
  fr: pagesFor("fr"),
};
