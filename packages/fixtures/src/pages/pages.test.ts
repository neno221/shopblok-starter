import { ErrorPage, NotFoundPage } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { commerceFixtures } from "../commerce";
import { pageFixtures } from ".";

describe("the page fixtures (T48)", () => {
  it("parse as the templates' contracts in every locale, with the market's own links", () => {
    for (const [locale, pages] of Object.entries(pageFixtures)) {
      expect(NotFoundPage.parse(pages.notFound)).toEqual(pages.notFound);
      expect(ErrorPage.parse(pages.error)).toEqual(pages.error);
      const { header } = commerceFixtures[locale as keyof typeof commerceFixtures];
      expect(pages.notFound.homeHref).toBe(header.content.homeHref);
      expect(pages.notFound.searchHref).toBe(header.content.utilities.search);
    }
    expect(pageFixtures.en.notFound).toEqual({ homeHref: "/us", searchHref: "/us/search" });
  });
});
