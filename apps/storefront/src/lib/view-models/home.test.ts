import { pageFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { HomePage } from "@shopblok/registry/contracts";
import { describe, expect, it } from "vitest";
import { HERO_IMAGE, siteText } from "../site";
import { HOME_CATEGORIES, NEW_ARRIVALS, toHomePage } from "./home";

const cards = pageFixtures.en.productListing.results.grid.products;
const input = (categories: number, products: number) => ({
  hero: { ...siteText("en").hero, image: HERO_IMAGE },
  categories: Array.from({ length: categories }, (_, i) => ({
    label: `Category ${i}`,
    href: `/us/categories/c${i}`,
  })),
  newArrivals: Array.from({ length: products }, (_, i) => ({
    ...cards[i % cards.length]!,
    id: `prod_${i}`,
  })),
  copy: catalogs.en.templates.home,
  storeHref: "/us/store",
});

describe("toHomePage", () => {
  it("is a home the contract takes, the sections capped at eight", () => {
    const page = toHomePage(input(10, 12));
    expect(HomePage.parse(page)).toEqual(page);
    expect(page.categories?.items).toHaveLength(HOME_CATEGORIES);
    expect(page.newArrivals?.products).toHaveLength(NEW_ARRIVALS);
    expect(page.newArrivals?.viewAll?.href).toBe("/us/store?sort=newest");
    expect(page.hero.action).toEqual({ label: siteText("en").hero.action, href: "/us/store" });
    expect(page.shopAll).toEqual({ label: catalogs.en.templates.home.shopAll, href: "/us/store" });
  });

  it("leaves out the sections a shop has nothing for", () => {
    const page = toHomePage(input(0, 0));
    expect(HomePage.parse(page)).toEqual(page);
    expect(page.categories).toBeUndefined();
    expect(page.newArrivals).toBeUndefined();
  });
});
