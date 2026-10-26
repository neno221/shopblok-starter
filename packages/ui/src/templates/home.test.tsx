// Ours (T51, SETUP.md "Home (T51)"). The home template in Testing Library and happy-dom: the page's
// one `<main>` and `<h1>`, the hero's way into the shop, the category tiles (one link each, named
// by the category), the new arrivals' carousel, the link to every product, and a shop without
// categories or products.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_IDS, HomeTemplate, homeCopy } from "./home";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const slots = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
});

function renderHome(locale: (typeof LOCALES)[number] = "en", props = {}) {
  const page = pageFixtures[locale].home;
  return render(
    <HomeTemplate
      {...page}
      copy={homeCopy(catalogs[locale])}
      locale="en-US"
      prefetch={false}
      {...props}
    />,
  );
}

describe("HomeTemplate", () => {
  it.each(LOCALES)("is the page's main with the hero's title as its one h1, in %s", (locale) => {
    renderHome(locale);
    const page = pageFixtures[locale].home;
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("data-slot")).toBe("home-template");
    expect(main.getAttribute("data-variant")).toBe("default");
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(page.hero.title);
    expect(h1[0]?.id).toBe(HOME_IDS.hero);
  });

  it("leads into the shop from the hero, with its line and picture", () => {
    renderHome();
    const { hero } = pageFixtures.en.home;
    const action = slot("home-hero-action") as HTMLElement;
    expect(action.textContent).toBe(hero.action.label);
    expect(action.getAttribute("href")).toBe(hero.action.href);
    expect(slot("home-hero-text")?.textContent).toBe(hero.text);
    expect(slot("home-hero")?.getAttribute("aria-labelledby")).toBe(HOME_IDS.hero);
    expect(slot("home-hero")?.querySelector("img")).toBeTruthy();
  });

  it("draws each category as one link named by the category, under its h2", () => {
    renderHome();
    const { categories } = pageFixtures.en.home;
    const section = slot("home-categories") as HTMLElement;
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe(categories?.title);
    const tiles = slots("home-category");
    expect(tiles).toHaveLength(categories?.items.length ?? 0);
    for (const [i, tile] of (categories?.items ?? []).entries()) {
      expect(tiles[i]?.getAttribute("href")).toBe(tile.href);
      expect(within(section).getByRole("link", { name: tile.label })).toBe(tiles[i]);
    }
  });

  it("draws the new arrivals as a carousel, before the link to every product", () => {
    renderHome();
    const { newArrivals, shopAll } = pageFixtures.en.home;
    const carousel = slot("product-carousel") as HTMLElement;
    expect(within(carousel).getByRole("heading", { level: 2 }).textContent).toBe(
      newArrivals?.title,
    );
    const all = slot("home-shop-all") as HTMLElement;
    expect(all.textContent).toBe(shopAll.label);
    expect(all.getAttribute("href")).toBe(shopAll.href);
    expect(carousel.compareDocumentPosition(all) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws the hero and the link to every product alone in a shop with nothing yet", () => {
    renderHome("en", { categories: undefined, newArrivals: undefined });
    expect(slot("home-categories")).toBeNull();
    expect(slot("product-carousel")).toBeNull();
    expect(slot("home-hero")).toBeTruthy();
    expect(slot("home-shop-all")).toBeTruthy();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("is a div with another id where the page has its main already", () => {
    renderHome("en", { as: "div", mainId: "home" });
    expect(screen.queryByRole("main")).toBeNull();
    expect(slot("home-template")?.tagName).toBe("DIV");
    expect(slot("home-template")?.id).toBe("home");
  });
});
