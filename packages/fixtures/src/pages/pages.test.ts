import {
  ErrorPage,
  HomePage,
  ListingResults,
  NotFoundPage,
  ProductDetailPage,
  ProductListingPage,
  SearchResultsPage,
} from "@shopblok/registry/contracts";
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

  it("give the product page in every locale, without the product among its related ones (T49)", () => {
    for (const pages of Object.values(pageFixtures)) {
      expect(ProductDetailPage.parse(pages.productDetail)).toEqual(pages.productDetail);
      expect(pages.productDetail.related?.products.length).toBeGreaterThan(0);
      expect(pages.productDetail.buyBox.selection).toEqual({});
    }
  });

  it("give the listing and the search page in every locale, their forms landing on the search (T50)", () => {
    for (const pages of Object.values(pageFixtures)) {
      const { productListing: listing, searchResults: search } = pages;
      expect(ProductListingPage.parse(listing)).toEqual(listing);
      expect(SearchResultsPage.parse(search)).toEqual(search);
      expect(listing.results.filters?.action).toBe(search.search.action);
      expect(listing.results.toolbar.sort.action).toBe(search.search.action);
      expect(listing.results.filters?.params).toEqual([
        { name: "scope", value: "category:hoodies" },
      ]);
      expect(search.results.toolbar.sort.selected).toBe("relevance");
      expect(search.results.filters?.params).toEqual([{ name: "q", value: search.search.query }]);
      expect(listing.breadcrumbs.current).toBe(listing.title);
    }
  });

  it("give the home in every locale: the store as the hero's and the last link's way (T51)", () => {
    for (const pages of Object.values(pageFixtures)) {
      const { home } = pages;
      expect(HomePage.parse(home)).toEqual(home);
      expect(home.hero.action.href).toBe(home.shopAll.href);
      expect(home.shopAll.href).toMatch(/\/store$/);
      expect(home.categories?.items.length).toBeGreaterThan(0);
      expect(home.newArrivals?.viewAll?.href).toBe(`${home.shopAll.href}?sort=newest`);
    }
    expect(pageFixtures.en.home.shopAll.href).toBe("/us/store");
  });

  it("refuse results whose filters and toolbar count different listings", () => {
    const { results } = pageFixtures.en.productListing;
    const filters = results.filters;
    expect(filters).toBeDefined();
    if (filters === undefined) return;
    expect(
      ListingResults.safeParse({ ...results, filters: { ...filters, resultCount: 1 } }).success,
    ).toBe(false);
    expect(
      ListingResults.safeParse({ ...results, toolbar: { ...results.toolbar, count: 1 } }).success,
    ).toBe(false);
  });
});
