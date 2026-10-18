// Ours (T37, SETUP.md "Listing organisms (T37)"). ProductToolbar's tests, in Testing Library and
// happy-dom: the count, the sort it holds, the slot for the filters button, the grid or list toggle
// (a group of two links, the current one marked), the order of the parts, the wrapping classes, a
// long German and Greek label, the four catalogs and a read of the file's imports. The two-row
// layout on a phone is a matter of pixels: the lead's browser checks and the design system's states
// show it.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { SortState } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { ProductToolbar, type ProductToolbarProps } from "./product-toolbar";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.productToolbar;
const sortCopyOf = (locale: Locale) => catalogs[locale].molecules.sortSelect;

/** The sort as the stories build it from the catalog's words, for the market's listing. */
function sortOf(locale: Locale, selected = "relevance"): SortState {
  const words = sortCopyOf(locale).options;
  return {
    action: `${commerceFixtures[locale].prefix}/store`,
    name: "sort",
    options: [
      { value: "relevance", label: words.relevance },
      { value: "newest", label: words.newest },
      { value: "price-asc", label: words.priceAsc },
      { value: "price-desc", label: words.priceDesc },
    ],
    selected,
    params: [{ name: "category", value: "women-hoodies" }],
  };
}

const viewOf = (current: "grid" | "list" = "grid") => ({
  current,
  gridHref: "/us/store?view=grid",
  listHref: "/us/store?view=list",
});

function element(locale: Locale, props: Partial<ProductToolbarProps> = {}) {
  return (
    <ProductToolbar
      count={24}
      sort={sortOf(locale)}
      view={viewOf()}
      copy={copyOf(locale)}
      sortCopy={sortCopyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}
const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const bar = () => slot("product-toolbar") as HTMLElement;
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");

describe("ProductToolbar: the count", () => {
  it.each(LOCALES)("says how many products there are, in %s", (locale) => {
    render(element(locale));
    expect(slot("product-toolbar-count")?.textContent).toBe(
      formatMessage(copyOf(locale).count, { count: 24 }, htmlLang[locale]),
    );
  });

  it.each([
    [0, "No products"],
    [1, "1 product"],
    [24, "24 products"],
    [1234, "1,234 products"],
  ])("reads %i as %j", (count, text) => {
    render(element("en", { count }));
    expect(slot("product-toolbar-count")?.textContent).toBe(text);
  });

  it("still draws the sort and the toggle when there are no products", () => {
    render(element("en", { count: 0 }));
    expect(screen.getByRole("combobox", { name: "Sort by" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "View" })).toBeTruthy();
  });

  it("wraps its text and shrinks before the row wraps", () => {
    render(element("en"));
    const count = slot("product-toolbar-count") as HTMLElement;
    expect(count.tagName).toBe("P");
    expect(count.className).toContain("wrap-anywhere");
    expect(count.className).toContain("min-w-0");
    expect(count.className).toContain("flex-1");
    // A small basis: the row breaks where the bases stop fitting, so the toggle stays beside the count.
    expect(count.className).toContain("basis-16");
  });
});

describe("ProductToolbar: the sort", () => {
  it.each(LOCALES)("holds SortSelect, a GET form to the listing, in %s", (locale) => {
    render(element(locale));
    const form = slot("sort-select") as HTMLFormElement;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe(sortOf(locale).action);
    expect(screen.getByRole("combobox", { name: sortCopyOf(locale).label })).toBeTruthy();
    expect(screen.getByRole("button", { name: sortCopyOf(locale).apply })).toBeTruthy();
    // The listing's filters ride along, and the page does not.
    expect(new FormData(form).get("category")).toBe("women-hoodies");
    expect(form.querySelector('input[name="page"]')).toBeNull();
  });

  it("keeps the chosen sort", () => {
    render(element("en", { sort: sortOf("en", "price-desc") }));
    expect((screen.getByRole("combobox", { name: "Sort by" }) as HTMLSelectElement).value).toBe(
      "price-desc",
    );
  });

  it("takes a row of its own on a phone and its own width from sm", () => {
    render(element("en"));
    expect(slot("sort-select")?.className).toContain("w-full");
    expect(slot("sort-select")?.className).toContain("sm:w-auto");
  });
});

describe("ProductToolbar: the grid or list toggle", () => {
  it.each(LOCALES)("is a group named for it, with two 44 px links, in %s", (locale) => {
    render(element(locale));
    const copy = copyOf(locale);
    const group = screen.getByRole("group", { name: copy.view });
    expect(group).toBe(slot("product-toolbar-view"));
    const links = within(group).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([copy.grid, copy.list]);
    expect(within(group).getByRole("link", { name: copy.grid }).getAttribute("href")).toBe(
      viewOf().gridHref,
    );
    expect(within(group).getByRole("link", { name: copy.list }).getAttribute("href")).toBe(
      viewOf().listHref,
    );
    for (const link of links) {
      expect(link.className).toContain("size-11");
      expect(link.className).toContain("focus-visible:ring-ring");
      expect(link.className).not.toMatch(/ring-ring\//);
      expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(link.querySelector(".sr-only")?.textContent).toBe(link.textContent);
      expect(link.getAttribute("data-prefetch")).toBe("false");
    }
  });

  it.each([
    ["grid", "Grid", "List"],
    ["list", "List", "Grid"],
  ] as const)("marks %s as the current one and draws it pressed", (current, on, off) => {
    render(element("en", { view: viewOf(current) }));
    const group = screen.getByRole("group", { name: "View" });
    const here = within(group).getByRole("link", { name: on });
    const there = within(group).getByRole("link", { name: off });
    expect(here.getAttribute("aria-current")).toBe("true");
    expect(there.hasAttribute("aria-current")).toBe(false);
    // Drawn from the attribute: a filled background and a darker border, not a colour alone.
    expect(here.className).toContain("aria-[current=true]:bg-muted");
    expect(here.className).toContain("aria-[current=true]:border-foreground");
    expect(group.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it("draws no toggle when the page gives no view", () => {
    render(element("en", { view: undefined }));
    expect(screen.queryByRole("group", { name: "View" })).toBeNull();
    expect(slot("product-toolbar-view")).toBeNull();
  });

  it("passes next/link's prefetch on to its links", () => {
    render(element("en", { prefetch: true }));
    const links = within(screen.getByRole("group", { name: "View" })).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("data-prefetch"))).toEqual(["true", "true"]);
  });
});

describe("ProductToolbar: the filters slot", () => {
  const button = <button type="button">Filters</button>;

  it("draws what the page puts in the slot, below lg only", () => {
    render(element("en", { filters: button }));
    const box = slot("product-toolbar-filters") as HTMLElement;
    expect(box.className).toContain("lg:hidden");
    expect(box.className).toContain("max-w-full");
    expect(within(box).getByRole("button", { name: "Filters" })).toBeTruthy();
  });

  it("draws no box when there is nothing in the slot", () => {
    render(element("en"));
    expect(slot("product-toolbar-filters")).toBeNull();
  });

  it("draws the parts in the order the eye reads them: filters, count, toggle, sort", () => {
    render(element("en", { filters: button }));
    const parts = [
      slot("product-toolbar-filters"),
      slot("product-toolbar-count"),
      slot("product-toolbar-view"),
      slot("sort-select"),
    ] as HTMLElement[];
    expect([...bar().children]).toEqual(parts);
    // The tab order is the same.
    const tabbable = [...bar().querySelectorAll("a[href], button, select")];
    expect(tabbable.map((each) => each.tagName)).toEqual(["BUTTON", "A", "A", "SELECT", "BUTTON"]);
  });

  it("is a row that wraps", () => {
    render(element("en"));
    expect(bar().className).toContain("flex");
    expect(bar().className).toContain("flex-wrap");
    expect(bar().className).toContain("items-center");
  });

  it("passes a class and attributes to the bar, and keeps its own", () => {
    render(element("en", { className: "border-b pb-3", id: "toolbar" }));
    expect(bar().className).toContain("border-b pb-3");
    expect(bar().className).toContain("flex-wrap");
    expect(bar().id).toBe("toolbar");
  });
});

describe("ProductToolbar: long labels", () => {
  it.each(longLabels)("wraps a long %s label, and cuts nothing", (locale, long) => {
    const sort: SortState = {
      ...sortOf(locale, "price-asc"),
      options: [
        { value: "relevance", label: long.optionLabel },
        { value: "newest", label: long.hint },
        { value: "price-asc", label: long.toggleLabel },
        { value: "price-desc", label: long.badge },
      ],
    };
    render(
      element(locale, {
        sort,
        filters: <button type="button">{long.linkLabel}</button>,
        copy: { ...copyOf(locale), view: long.fieldLabel, grid: long.action, list: long.chipLabel },
        sortCopy: { ...sortCopyOf(locale), label: long.fieldLabel, apply: long.action },
      }),
    );
    expect(classesIn(bar()).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    expect(screen.getByRole("group", { name: long.fieldLabel })).toBeTruthy();
    expect(screen.getByRole("link", { name: long.action })).toBeTruthy();
    expect(screen.getByRole("link", { name: long.chipLabel })).toBeTruthy();
    expect(slot("product-toolbar-filters")?.className).toContain("max-w-full");
  });
});

describe("the file (D42)", () => {
  const source = readFileSync(path.join(import.meta.dirname, "product-toolbar.tsx"), "utf8");
  const specifiers = [...source.matchAll(/(?:from\s+|import\(\s*)["']([^"']+)["']/g)].map(
    (match) => match[1] ?? "",
  );

  it("is a server component: no state, no handlers, no client directive", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(source).not.toMatch(/\buse(?:State|Effect|Reducer|Ref|Callback|Memo)\(/);
    expect(source).not.toMatch(/\bon[A-Z][A-Za-z]+=\{/);
  });

  it("builds the sort with SortSelect and formats with the formatters alone", () => {
    expect(specifiers).toContain("@shopblok/ui/molecules/sort-select");
    expect(specifiers).toContain("@shopblok/i18n/format");
    expect(source).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']@shopblok\/i18n["']/ms);
  });
});
