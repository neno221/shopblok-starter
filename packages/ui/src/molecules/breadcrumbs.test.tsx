import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { Breadcrumbs, type BreadcrumbsProps } from "./breadcrumbs";

const source = readFileSync(path.join(import.meta.dirname, "breadcrumbs.tsx"), "utf8");

/** The Heritage Hoodie's trail: Home, Women, Clothing, Hoodies, and the product as the current page. */
function trailOf(locale: Locale) {
  const { product } = commerceFixtures[locale];
  return { trail: product.breadcrumbs, current: product.title };
}

function setup(locale: Locale = "en", props: Partial<BreadcrumbsProps> = {}) {
  return render(
    <Breadcrumbs {...trailOf(locale)} copy={catalogs[locale].molecules.breadcrumbs} {...props} />,
  );
}

const step = (label: string, href = `/us/${label.toLowerCase()}`) => ({ label, href });
const items = () => screen.getAllByRole("listitem");
/** The classes of the list item that holds `text`. */
const itemOf = (text: string) => screen.getByText(text).closest("li") as HTMLElement;

describe("Breadcrumbs", () => {
  it("is a server component: no state and no events, so no 'use client'", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("is a navigation named by the copy, with an ordered list", () => {
    setup();
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("list").tagName).toBe("OL");
  });

  it("shows the trail as links in order, and the current page last", () => {
    setup();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Home", "Women", "Clothing", "Hoodies"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      commerceFixtures.en.product.breadcrumbs.map((each) => each.href),
    );
    // Separators are decoration, so the items are the steps, the ellipsis below `md`, and the page.
    expect(items().map((item) => item.textContent)).toEqual([
      "Home",
      "Levels in between",
      "Women",
      "Clothing",
      "Hoodies",
      "Heritage Hoodie",
    ]);
  });

  it("shows the current page as text marked aria-current, not as a link", () => {
    setup();
    const page = screen.getByText("Heritage Hoodie");
    expect(page.getAttribute("aria-current")).toBe("page");
    expect(page.tagName).toBe("SPAN");
    // The kit gives the current page `role="link"` and `aria-disabled`; here it is text.
    expect(page.getAttribute("role")).toBeNull();
    expect(page.getAttribute("aria-disabled")).toBeNull();
    expect(screen.queryByRole("link", { name: "Heritage Hoodie" })).toBeNull();
    expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("collapses the steps between Home and the parent below `md`: Home … Parent › Current", () => {
    setup();
    // The middle steps and their separators give way below `md`…
    for (const label of ["Women", "Clothing"]) {
      expect(itemOf(label).className).toContain("max-md:hidden");
      expect(itemOf(label).nextElementSibling?.className).toContain("max-md:hidden");
    }
    // …Home, the parent and the current page stay…
    for (const label of ["Home", "Hoodies", "Heritage Hoodie"]) {
      expect(itemOf(label).className).not.toContain("max-md:hidden");
    }
    // …and an ellipsis shows in their place, below `md` only.
    const ellipsis = itemOf("Levels in between");
    expect(ellipsis.className).toContain("md:hidden");
    expect(ellipsis.className).not.toContain("max-md");
    expect(ellipsis.nextElementSibling?.className).toContain("md:hidden");
    // It sits between Home and the parent in reading order.
    const order = items().map((item) => item.textContent);
    expect(order.indexOf("Home")).toBeLessThan(order.indexOf("Levels in between"));
    expect(order.indexOf("Levels in between")).toBeLessThan(order.indexOf("Women"));
  });

  it("keeps every step in the markup at every width, for a crawler and for `md` and up", () => {
    setup();
    expect(screen.getAllByRole("link")).toHaveLength(4);
    for (const label of ["Women", "Clothing"]) {
      expect(screen.getByRole("link", { name: label }).getAttribute("href")).toMatch(/^\/us\//);
    }
  });

  it("reads the ellipsis out ('Levels in between') so a screen reader knows steps are left out", () => {
    setup();
    const ellipsis = document.querySelector("[data-slot=breadcrumb-ellipsis]");
    expect(within(ellipsis as HTMLElement).getByText("Levels in between").className).toContain(
      "sr-only",
    );
    expect(ellipsis?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not collapse one step: the ellipsis would take the room it saves", () => {
    setup("en", { trail: [step("Home"), step("Women"), step("Clothing")], current: "Hoodies" });
    expect(screen.queryByText("Levels in between")).toBeNull();
    for (const item of items()) expect(item.className).not.toContain("max-md:hidden");
  });

  it.each([
    ["Home alone", [step("Home")]],
    ["Home and the parent", [step("Home"), step("Women")]],
  ])("does not collapse %s", (_name, trail) => {
    setup("en", { trail, current: "Clothing" });
    expect(screen.queryByText("Levels in between")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(trail.length);
    for (const item of items()) expect(item.className).not.toContain("hidden");
  });

  it("collapses from two steps between: Home, A, B, C, current → Home … C › current", () => {
    setup("en", {
      trail: [step("Home"), step("A"), step("B"), step("C")],
      current: "Now",
    });
    expect(itemOf("A").className).toContain("max-md:hidden");
    expect(itemOf("B").className).toContain("max-md:hidden");
    expect(itemOf("C").className).not.toContain("max-md:hidden");
    expect(screen.getByText("Levels in between")).toBeTruthy();
  });

  it("draws a separator after every step, pointing along the reading direction", () => {
    setup();
    const separators = document.querySelectorAll("[data-slot=breadcrumb-separator]");
    // After Home, the ellipsis, Women, Clothing and Hoodies.
    expect(separators).toHaveLength(5);
    for (const separator of separators) {
      expect(separator.getAttribute("aria-hidden")).toBe("true");
      expect(separator.querySelector("svg")?.getAttribute("class")).toContain("rtl:rotate-180");
    }
  });

  it("makes every link a 44 × 44 px target; the current page is text", () => {
    setup();
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("min-h-11");
      expect(link.className).toContain("min-w-11");
    }
    expect(screen.getByText("Heritage Hoodie").className).not.toContain("min-h-11");
  });

  it("is reached with Tab, link by link, with the ring at full strength", async () => {
    const user = userEvent.setup();
    setup();
    for (const link of screen.getAllByRole("link")) {
      await user.tab();
      expect(document.activeElement).toBe(link);
      expect(link.className).toContain("focus-visible:ring-ring");
    }
  });

  it("draws plain links: nothing a router would prefetch, no button", () => {
    setup();
    expect(screen.queryAllByRole("button")).toEqual([]);
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("role")).toBeNull();
      expect(link.tagName).toBe("A");
    }
  });

  it.each(LOCALES)("says its name and its hidden levels in %s", (locale) => {
    const copy = catalogs[locale].molecules.breadcrumbs;
    setup(locale);
    expect(screen.getByRole("navigation", { name: copy.label })).toBeTruthy();
    expect(screen.getByText(copy.more)).toBeTruthy();
    expect(
      screen.getByText(commerceFixtures[locale].product.title).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("has no English text of its own in German", () => {
    setup("de");
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Breadcrumb|Levels in between/);
    expect(screen.getByRole("navigation", { name: "Brotkrumennavigation" })).toBeTruthy();
  });

  it.each(longLabels)(
    "wraps long %s names instead of cutting them, and keeps the full name",
    (_locale, strings) => {
      const { container } = setup("en", {
        trail: [
          step("Home"),
          step(strings.linkLabel),
          step(strings.chipLabel),
          step(strings.badge),
        ],
        current: strings.productName,
      });
      for (const name of [strings.linkLabel, strings.chipLabel, strings.badge]) {
        const link = screen.getByRole("link", { name });
        expect(link.className).not.toMatch(CLIPPING_CLASSES);
        expect(within(link).getByText(name).className).toContain("wrap-anywhere");
      }
      const page = screen.getByText(strings.productName);
      expect(page.className).toContain("wrap-anywhere");
      expect(page.getAttribute("aria-current")).toBe("page");
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      // Every item may shrink to the row, so a long name cannot widen the page.
      for (const item of items()) {
        if (item.textContent?.includes(strings.productName)) {
          expect(item.className).toContain("min-w-0");
          expect(item.className).toContain("max-w-full");
        }
      }
    },
  );

  it("passes the navigation's own props on and merges the class", () => {
    setup("en", { id: "trail", className: "mb-4" });
    const nav = screen.getByRole("navigation");
    expect(nav.id).toBe("trail");
    expect(nav.className).toContain("mb-4");
  });

  it("draws no dark variant and no tinted ring", () => {
    setup();
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
  });
});
