// Ours (T50, SETUP.md "Listing pages and search (T50)"). The product listing and the search
// results templates in Testing Library and happy-dom: the page's one `<main>` and `<h1>`, the
// filters' sidebar and drawer with and without filters, the chips below `lg`, the grid's headings,
// the pager's addresses, and the island's place before the results it hides.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductListingTemplate, productListingCopy } from "./product-listing";
import { SearchResultsTemplate, searchResultsCopy } from "./search-results";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const slots = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const hrefFor = (n: number) =>
  n === 1 ? "/us/categories/hoodies" : `/us/categories/hoodies/page/${n}`;

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

function renderListing(locale: (typeof LOCALES)[number] = "en", props = {}) {
  const page = pageFixtures[locale].productListing;
  return render(
    <ProductListingTemplate
      {...page}
      copy={productListingCopy(catalogs[locale])}
      locale="en-US"
      hrefFor={hrefFor}
      prefetch={false}
      {...props}
    />,
  );
}

function withoutFilters() {
  const { filters: _filters, ...results } = pageFixtures.en.productListing.results;
  return results;
}

describe("ProductListingTemplate", () => {
  it.each(LOCALES)("is the page's main with the title as its one h1, in %s", (locale) => {
    renderListing(locale);
    const page = pageFixtures[locale].productListing;
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("data-slot")).toBe("product-listing-template");
    expect(main.getAttribute("data-variant")).toBe("default");
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(page.title);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("draws the breadcrumbs before the title, ending at the current page", () => {
    renderListing();
    const page = pageFixtures.en.productListing;
    const trail = within(slot("breadcrumb") as HTMLElement);
    for (const step of page.breadcrumbs.trail)
      expect(trail.getByRole("link", { name: step.label }).getAttribute("href")).toBe(step.href);
    expect(trail.getByText(page.breadcrumbs.current)).toBeTruthy();
    const title = slot("product-listing-title") as HTMLElement;
    expect(
      (slot("breadcrumb") as HTMLElement).compareDocumentPosition(title) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("is a div with another id where the page has its main already", () => {
    renderListing("en", { as: "div", mainId: "listing" });
    expect(screen.queryByRole("main")).toBeNull();
    expect(slot("product-listing-template")?.tagName).toBe("DIV");
    expect(slot("product-listing-template")?.id).toBe("listing");
  });

  it("draws the filters' sidebar, and the drawer in the toolbar, when there are filters", () => {
    renderListing();
    const page = pageFixtures.en.productListing;
    expect(page.results.filters).toBeDefined();
    expect(slot("listing-filters")).not.toBeNull();
    expect(slot("listing-filters")?.className).toContain("max-lg:hidden");
    expect(slot("listing-filters")?.contains(slot("filter-sidebar"))).toBe(true);
    expect(slot("product-toolbar-filters")).not.toBeNull();
    expect(slot("listing-results")?.className).toContain("lg:grid-cols-[16rem_minmax(0,1fr)]");
  });

  it("draws neither the sidebar nor the drawer without filters", () => {
    renderListing("en", {
      results: withoutFilters(),
    });
    expect(slot("listing-filters")).toBeNull();
    expect(slot("filter-sidebar")).toBeNull();
    expect(slot("product-toolbar-filters")).toBeNull();
    expect(slot("active-filter-chips")).toBeNull();
    expect(slot("listing-results")?.className).not.toContain("lg:grid-cols");
    // The products are there all the same.
    expect(slot("product-grid")).not.toBeNull();
  });

  it("repeats the chosen filters as chips below lg, after the toolbar", () => {
    renderListing();
    const active = pageFixtures.en.productListing.results.filters?.active;
    expect(active?.filters.length).toBeGreaterThan(0);
    const lists = slots("active-filter-chips");
    // One in the sidebar, which is hidden below lg, and one in the products' column.
    const chips = lists.find((list) => slot("listing-products")?.contains(list));
    expect(chips).toBeDefined();
    expect(chips?.className).toContain("lg:hidden");
    expect(chips?.querySelectorAll('[data-slot="chip"]')).toHaveLength(
      active?.filters.length ?? -1,
    );
    expect(
      (slot("product-toolbar") as HTMLElement).compareDocumentPosition(chips as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const sidebarChips = lists.find((list) => slot("listing-filters")?.contains(list));
    expect(sidebarChips?.className ?? "").not.toContain("lg:hidden");
  });

  it("draws no chips when no filter is chosen", () => {
    const results = pageFixtures.en.productListing.results;
    const { active: _active, ...filters } = results.filters as NonNullable<typeof results.filters>;
    renderListing("en", { results: { ...results, filters } });
    expect(slot("active-filter-chips")).toBeNull();
    expect(slot("filter-sidebar")).not.toBeNull();
  });

  it("draws each product in the grid with its name as an h2, under the page's one h1", () => {
    renderListing();
    const products = pageFixtures.en.productListing.results.grid.products;
    const grid = within(slot("product-grid") as HTMLElement);
    const headings = grid.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(
      products.map((product) => product.title),
    );
    expect(grid.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("links the pages by hrefFor", () => {
    renderListing();
    const { page } = pageFixtures.en.productListing.results;
    expect(page.pageCount).toBeGreaterThan(1);
    const nav = within(screen.getByRole("navigation", { name: /pagination/i }));
    const hrefs = nav.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/us/categories/hoodies/page/2");
    expect(hrefs).toContain("/us/categories/hoodies");
    expect(hrefs).not.toContain("/us/categories/hoodies/page/1");
  });

  it("draws the island before the results, which it hides once it is active", () => {
    renderListing("en", { slots: { island: <div data-slot="test-island" className="peer" /> } });
    const island = slot("test-island") as HTMLElement;
    const results = slot("listing-results") as HTMLElement;
    expect(island.parentElement).toBe(results.parentElement);
    expect(island.nextElementSibling).toBe(results);
    expect(results.className.split(/\s+/)).toContain("peer-data-active:hidden");
    expect(slot("product-listing-region")?.contains(island)).toBe(true);
  });

  it("draws the results alone without an island", () => {
    renderListing();
    const region = slot("product-listing-region") as HTMLElement;
    expect(region.children).toHaveLength(1);
    expect(region.firstElementChild).toBe(slot("listing-results"));
  });
});

describe("SearchResultsTemplate", () => {
  function renderSearch(locale: (typeof LOCALES)[number] = "en") {
    const page = pageFixtures[locale].searchResults;
    return render(
      <SearchResultsTemplate
        {...page}
        copy={searchResultsCopy(catalogs[locale])}
        locale="en-US"
        hrefFor={(n) => `/us/search?q=hoodie&page=${n}`}
        prefetch={false}
      />,
    );
  }

  it.each(LOCALES)("is the page's main with the title as its one h1, in %s", (locale) => {
    renderSearch(locale);
    const page = pageFixtures[locale].searchResults;
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(slot("search-results-template")?.getAttribute("data-variant")).toBe("default");
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(page.title);
  });

  it("draws the search field with the query before the title", () => {
    renderSearch();
    const page = pageFixtures.en.searchResults;
    const field = slot("search-field") as HTMLElement;
    expect(page.search.query).not.toBe("");
    expect(within(field).getByRole("searchbox")).toHaveProperty("value", page.search.query);
    expect(
      field.querySelector("form")?.getAttribute("action") ?? field.getAttribute("action"),
    ).toBe(page.search.action);
    expect(
      field.compareDocumentPosition(slot("search-results-title") as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("draws the same results as a listing, with the sidebar, the grid and the pager", () => {
    renderSearch();
    expect(slot("listing-results")).not.toBeNull();
    expect(slot("filter-sidebar")).not.toBeNull();
    expect(slot("product-grid")).not.toBeNull();
    expect(slot("listing-results")?.className).not.toContain("peer-data-active");
    const nav = within(screen.getByRole("navigation", { name: /pagination/i }));
    expect(nav.getAllByRole("link").map((link) => link.getAttribute("href"))).toContain(
      "/us/search?q=hoodie&page=2",
    );
  });
});

describe("ProductListingTemplate: a banner and an introduction (T69)", () => {
  const banner = {
    src: "/api/media/file/banner.webp",
    alt: "Hoodies on a rail",
    width: 1500,
    height: 500,
  };

  it("draws the banner, then the introduction, under the title and before the results", () => {
    renderListing("en", { banner, slots: { intro: <p>Heavy cotton for cold mornings.</p> } });
    const title = slot("product-listing-title");
    const image = slot("product-listing-banner");
    const intro = slot("product-listing-intro");
    expect(image?.tagName).toBe("IMG");
    expect(image?.getAttribute("alt")).toBe("Hoodies on a rail");
    expect(intro?.textContent).toBe("Heavy cotton for cold mornings.");
    expect(title?.compareDocumentPosition(image as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(image?.compareDocumentPosition(intro as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(intro?.compareDocumentPosition(slot("listing-results") as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    // The page's one h1 stays the title.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("draws neither without them", () => {
    renderListing();
    expect(slot("product-listing-banner")).toBeNull();
    expect(slot("product-listing-intro")).toBeNull();
  });
});
