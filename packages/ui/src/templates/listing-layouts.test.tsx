// Ours (T84, SETUP.md "Listing variants (T84)"). The listing's seven filter layouts, server-rendered
// (`renderToStaticMarkup`, as a shop's page is) and read back in happy-dom: every layout's filter
// form posts the same fields under the same names to the same `action` as M3's sidebar, so the
// listing island and `/search` read it unchanged (D59); each layout's own arrangement (the bar's
// and the rail's popovers, the closed groups, the toggles, the inline panel, the drawer's form
// without scripts); and the page's members and the search page drawing the layout they are given.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { VARIANTS, type VariantOf } from "@shopblok/registry/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ListingResultsFor } from "./listing-layouts";
import { listingResultsCopy } from "./listing-results";
import { ProductListingTemplate, productListingCopy } from "./product-listing";
import { SearchResultsTemplate, searchResultsCopy } from "./search-results";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const LAYOUTS = VARIANTS["product-listing"];
type Layout = VariantOf<"product-listing">;
const results = pageFixtures.en.productListing.results;
const filters = results.filters!;
const hrefFor = (n: number) => (n === 1 ? "/us/store" : `/us/store/page/${n}`);

/** The markup a layout's results draw on the server, as a document. */
function draw(layout: Layout, over: Partial<typeof results> = {}) {
  const html = renderToStaticMarkup(
    <ListingResultsFor
      {...results}
      {...over}
      layout={layout}
      copy={listingResultsCopy(catalogs.en)}
      locale="en-US"
      hrefFor={hrefFor}
      prefetch={false}
    />,
  );
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return { html, doc };
}

/** A form's fields as the query it sends: each name once, sorted. */
const names = (form: Element) =>
  [
    ...new Set(
      [...form.querySelectorAll("input[name], select[name]")].map(
        (field) => field.getAttribute("name") ?? "",
      ),
    ),
  ].sort();

/** The forms of a layout that GET the listing's `action` with its filters (not the sort's). */
function filterForms(doc: Document): Element[] {
  return [...doc.querySelectorAll(`form[action="${filters.action}"]`)].filter((form) =>
    filters.groups.some((group) =>
      form.querySelector(`[name="${group.id}"], [name^="${group.id}."]`),
    ),
  );
}

/** The noscript's markup parsed again: a browser with scripts reads it as text. */
function noscriptDoc(html: string): Document {
  const inner = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1] ?? "";
  return new DOMParser().parseFromString(`<body>${inner}</body>`, "text/html");
}

const expected = names(filterForms(draw("default").doc)[0]!);

describe("the listing's filter layouts (T84)", () => {
  it("has a layout for each of the family's values, each marking its root", () => {
    for (const layout of LAYOUTS) {
      const root = draw(layout).doc.querySelector('[data-slot="listing-results"]');
      expect(root?.getAttribute("data-layout"), layout).toBe(layout);
    }
  });

  it("posts the same fields to the same action in every layout, so /search reads them (D59)", () => {
    expect(expected).toEqual(
      expect.arrayContaining([
        "scope",
        ...filters.groups.filter((g) => g.kind !== "range").map((g) => g.id),
      ]),
    );
    for (const layout of LAYOUTS) {
      const { html, doc } = draw(layout);
      // The drawer's sheet is drawn on a press; without scripts its form is the noscript's.
      const forms = filterForms(layout === "drawer" ? noscriptDoc(html) : doc);
      expect(forms.length, layout).toBeGreaterThan(0);
      for (const form of forms) {
        expect(form.getAttribute("method"), layout).toBe("get");
        expect(names(form), layout).toEqual(expected);
      }
    }
  });

  it("sends each option's own value under its group's name, ticked as the listing has it", () => {
    const group = filters.groups.find((g) => g.kind === "checkbox" || g.kind === "swatch")!;
    if (group.kind !== "checkbox" && group.kind !== "swatch") throw new Error("no box group");
    for (const layout of LAYOUTS) {
      const { html, doc } = draw(layout);
      const form = filterForms(layout === "drawer" ? noscriptDoc(html) : doc)[0]!;
      for (const option of group.options) {
        const box = form.querySelector<HTMLInputElement>(
          `input[name="${group.id}"][value="${option.value}"]`,
        );
        expect(box, `${layout} ${option.value}`).not.toBeNull();
        expect(box?.hasAttribute("checked"), `${layout} ${option.value}`).toBe(option.selected);
      }
    }
  });

  it("top bar and rail: each group a button that opens its own popover, with no script", () => {
    for (const layout of ["top-bar", "rail"] as const) {
      const { doc } = draw(layout);
      const form = doc.querySelector(`[data-slot="filter-popovers"]`);
      expect(form?.getAttribute("data-orientation")).toBe(layout === "rail" ? "rail" : "bar");
      const triggers = [...doc.querySelectorAll('[data-slot="filter-popover-trigger"]')];
      const popovers = [...doc.querySelectorAll('[data-slot="filter-popover"]')];
      expect(triggers.length).toBe(filters.groups.filter((g) => g.kind !== "toggle").length);
      expect(popovers.map((p) => p.id)).toEqual(
        triggers.map((t) => t.getAttribute("popovertarget")),
      );
      expect(new Set(popovers.map((p) => p.id)).size).toBe(popovers.length);
      for (const popover of popovers) {
        expect(popover.getAttribute("popover")).toBe("auto");
        // Inside the form, so its fields are the form's.
        expect(form?.contains(popover)).toBe(true);
        expect(popover.querySelector('button[type="submit"]')?.textContent).toBe(
          catalogs.en.organisms.filterSidebar.apply,
        );
      }
      // Below `lg`, the drawer's button.
      expect(doc.querySelector('[data-slot="filter-drawer-trigger"]')).not.toBeNull();
    }
  });

  it("two copies of a layout on one page (the server's and the island's) share no popover id", () => {
    const html = renderToStaticMarkup(
      <>
        {[0, 1].map((key) => (
          <ListingResultsFor
            key={key}
            {...results}
            layout="top-bar"
            copy={listingResultsCopy(catalogs.en)}
            locale="en-US"
            hrefFor={hrefFor}
            prefetch={false}
          />
        ))}
      </>,
    );
    const ids = [...html.matchAll(/ id="([^"]+)" popover/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("accordion: native disclosures, the first open and the others closed but still in the form", () => {
    const { doc } = draw("accordion");
    const groups = [...doc.querySelectorAll('[data-slot="filter-disclosure"]')];
    expect(groups.length).toBe(filters.groups.filter((g) => g.kind !== "toggle").length);
    expect(groups.map((group) => group.hasAttribute("open"))).toEqual(
      groups.map((_, index) => index === 0),
    );
    // A closed group's chosen box is still the form's, ticked.
    const closed = groups[1]!;
    expect(closed.closest("form")).not.toBeNull();
    expect(closed.querySelector("input[checked]")).not.toBeNull();
    // The chips are above the grid, not in the sidebar.
    expect(
      doc.querySelector('[data-slot="filter-sidebar"] [data-slot="active-filter-chips"]'),
    ).toBeNull();
    expect(
      doc.querySelector('[data-slot="listing-products"] [data-slot="active-filter-chips"]'),
    ).not.toBeNull();
  });

  it("chips: every box and swatch option a 44 px pill holding a native box, no drawer", () => {
    const { doc } = draw("chips");
    const pills = [...doc.querySelectorAll('[data-slot="filter-toggle"]')];
    const options = filters.groups.flatMap((g) =>
      g.kind === "checkbox" || g.kind === "swatch" ? g.options : [],
    );
    expect(pills).toHaveLength(options.length);
    for (const pill of pills) {
      expect(pill.className).toContain("min-h-11");
      expect(pill.querySelector('input[type="checkbox"]')).not.toBeNull();
    }
    expect(doc.querySelector('[data-slot="filter-drawer-trigger"]')).toBeNull();
  });

  it("inline: one native panel, closed, holding the form with every group", () => {
    const { doc } = draw("inline");
    const panel = doc.querySelector('details[data-slot="filter-inline"]');
    expect(panel?.hasAttribute("open")).toBe(false);
    expect(panel?.querySelectorAll('[data-slot="filter-inline-group"]')).toHaveLength(
      filters.groups.length,
    );
    expect(panel?.querySelector('[data-slot="filter-inline-clear"]')?.getAttribute("href")).toBe(
      filters.active?.clearHref,
    );
    expect(doc.querySelector('[data-slot="filter-drawer-trigger"]')).toBeNull();
  });

  it("drawer: the drawer's button at every width, and the form in the page only without scripts", () => {
    const { html, doc } = draw("drawer");
    const wrap = doc.querySelector('[data-slot="product-toolbar-filters"]');
    expect(wrap?.className).not.toContain("lg:hidden");
    // Every sidebar is inside the noscript (which a browser with scripts reads as text).
    const sidebars = [...doc.querySelectorAll('[data-slot="filter-sidebar"]')];
    expect(sidebars.every((sidebar) => sidebar.closest("noscript") !== null)).toBe(true);
    expect(noscriptDoc(html).querySelector('[data-slot="filter-sidebar"]')).not.toBeNull();
    // The default layout hides the button from `lg`, where its sidebar stands.
    const standard = draw("default").doc.querySelector('[data-slot="product-toolbar-filters"]');
    expect(standard?.className).toContain("lg:hidden");
  });

  it("draws no filters at all for a listing with nothing to filter", () => {
    const { filters: _filters, ...bare } = results;
    for (const layout of LAYOUTS) {
      const html = renderToStaticMarkup(
        <ListingResultsFor
          {...bare}
          layout={layout}
          copy={listingResultsCopy(catalogs.en)}
          locale="en-US"
          hrefFor={hrefFor}
          prefetch={false}
        />,
      );
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
      expect(filterForms(doc), layout).toHaveLength(0);
      expect(html, layout).not.toContain("filter-popover");
      expect(html, layout).not.toContain("filter-toggles");
      expect(html, layout).not.toContain("filter-inline");
      expect(html, layout).not.toContain("noscript");
    }
  });
});

describe("the members and the search page (T84)", () => {
  it("draws each member's layout and says which member it is on the page's root", () => {
    const page = pageFixtures.en.productListing;
    for (const layout of LAYOUTS) {
      const html = renderToStaticMarkup(
        <ProductListingTemplate
          {...page}
          variant={layout}
          copy={productListingCopy(catalogs.en)}
          locale="en-US"
          hrefFor={hrefFor}
          prefetch={false}
        />,
      );
      const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
      const root = doc.querySelector('[data-slot="product-listing-template"]');
      expect(root?.getAttribute("data-variant"), layout).toBe(layout);
      expect(
        root?.querySelector('[data-slot="listing-results"]')?.getAttribute("data-layout"),
      ).toBe(layout);
    }
  });

  it("the search page follows the listing's layout (D101)", () => {
    const search = pageFixtures.en.searchResults;
    for (const layout of LAYOUTS) {
      const html = renderToStaticMarkup(
        <SearchResultsTemplate
          {...search}
          variant={layout}
          copy={searchResultsCopy(catalogs.en)}
          locale="en-US"
          hrefFor={hrefFor}
          prefetch={false}
        />,
      );
      expect(html, layout).toContain(`data-variant="${layout}"`);
      expect(html, layout).toContain(`data-layout="${layout}"`);
    }
  });
});
