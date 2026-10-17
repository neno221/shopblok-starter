import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type {
  CheckboxFacet,
  FacetGroup,
  SwatchFacet,
  ToggleFacet,
} from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { FilterGroup, TOGGLE_VALUE, type FilterGroupProps } from "./filter-group";

const read = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
const source = read("filter-group.tsx");
const rangeSource = read("filter-group-price-range.tsx");
const swatchSource = read("filter-group-swatch-option.tsx");

type Kind = FacetGroup["kind"];

/** One of the fixture's six facets, by id; the kind is checked so the tests need no cast. */
function facetOf<K extends Kind>(
  locale: Locale,
  id: string,
  kind: K,
): Extract<FacetGroup, { kind: K }> {
  const found = commerceFixtures[locale].facets.find((facet) => facet.id === id);
  if (found?.kind !== kind) throw new Error(`the fixture has no ${kind} facet "${id}"`);
  return found as Extract<FacetGroup, { kind: K }>;
}

const htmlLang = (locale: Locale) => commerceFixtures[locale].market.htmlLang;

function props(facet: FacetGroup, locale: Locale = "en"): FilterGroupProps {
  return { facet, copy: catalogs[locale].molecules.filterGroup, locale: htmlLang(locale) };
}

/** The group inside the GET form its caller draws; the form is where the fields are read from. */
function setup(facet: FacetGroup, locale: Locale = "en", extra: Partial<FilterGroupProps> = {}) {
  return render(
    <form method="get" action="#">
      <FilterGroup {...props(facet, locale)} {...extra} />
    </form>,
  );
}

const form = () => document.querySelector("form") as HTMLFormElement;
/** What the browser would send: every named field of the form, in order. */
const sent = () =>
  [...new FormData(form()).entries()].map(([name, value]) => `${name}=${String(value)}`);

// Testing Library joins the pieces of a name with a space ("M , 11 products"); a screen reader
// says the comma the same, so the tests compare the names with the space before a comma taken out.
const named = (expected: string) => (name: string) => name.replaceAll(" ,", ",") === expected;
const checkbox = (name: string) => screen.getByRole("checkbox", { name: named(name) });
const switchOf = (name: string) => screen.getByRole("switch", { name: named(name) });
const checked = (name: string) => checkbox(name).getAttribute("aria-checked");

/** A facet of long names, so a layout that clips them shows: the labels of the fixture's long line. */
function longCheckboxFacet(locale: "de" | "el"): CheckboxFacet {
  const { title, options } = commerceFixtures[locale].long.cartLine;
  const labels = options.flatMap(({ option, value }) => [option, value]);
  return {
    kind: "checkbox",
    id: "long",
    label: title,
    options: labels.map((label, index) => ({
      value: `v${index}`,
      label,
      count: index + 1,
      selected: index === 0,
    })),
  };
}

describe("FilterGroup", () => {
  // Some tests put server markup into the document by hand, which Testing Library does not clean.
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("the files", () => {
    it("is a server component; only the price range and the swatch are client components, and say why", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      for (const client of [rangeSource, swatchSource]) {
        expect(client).toMatch(/^"use client";$/m);
        // The header says why, in the comment above the directive.
        const header = client.slice(0, client.indexOf('"use client"')).replace(/^\/\/ ?/gm, "");
        expect(header).toMatch(/client\s+component/i);
        expect(client).not.toMatch(/@shopblok\/i18n|@shopblok\/fixtures|@shopblok\/registry/);
        expect(client).not.toMatch(/\bFlag\b/);
      }
    });

    it("imports the contracts as types only", () => {
      for (const file of [source, rangeSource, swatchSource]) {
        expect(file).not.toMatch(/^import (?!type\b)[^;]*@shopblok\/registry/m);
      }
    });

    it("has no fetch and builds no URL", () => {
      for (const file of [source, rangeSource, swatchSource]) {
        expect(file).not.toMatch(/\bfetch\(|URLSearchParams|new URL\(|location\./);
      }
    });
  });

  describe("a checkbox facet", () => {
    const size = facetOf("en", "size", "checkbox");

    it("is a group named by its visible legend, with a checkbox per option", () => {
      setup(size);
      const group = screen.getByRole("group", { name: "Size" });
      expect(group.tagName).toBe("FIELDSET");
      const legend = group.querySelector("legend") as HTMLElement;
      expect(legend.textContent).toBe("Size");
      expect(legend.className).not.toContain("sr-only");
      expect(within(group).getAllByRole("checkbox")).toHaveLength(size.options.length);
    });

    it("names each option with its count, read after the name, and draws the count apart", () => {
      setup(size);
      expect(checkbox("M, 11 products")).toBeTruthy();
      expect(checkbox("XXL, 4 products")).toBeTruthy();
      const row = checkbox("M, 11 products").closest("label") as HTMLElement;
      const count = row.querySelector("[data-slot=filter-count]") as HTMLElement;
      expect(count.textContent).toBe("11");
      expect(count.getAttribute("aria-hidden")).toBe("true");
      expect(count.className).toContain("text-muted-foreground");
    });

    it("says '1 product' for a count of one", () => {
      const category = facetOf("en", "category", "checkbox");
      setup(category, "en", { limit: 20 });
      expect(checkbox("T-shirts, 1 product")).toBeTruthy();
    });

    it("shows the chosen option as checked and the others as not", () => {
      setup(size);
      expect(checked("M, 11 products")).toBe("true");
      expect(checked("L, 10 products")).toBe("false");
    });

    it("sends each chosen value under the facet's id, repeated for two", () => {
      setup({
        ...size,
        options: size.options.map((option) => ({ ...option, selected: option.value !== "xs" })),
      });
      expect(sent()).toEqual(["size=s", "size=m", "size=l", "size=xl", "size=xxl"]);
    });

    it("sends the options chosen after the visitor's clicks", async () => {
      const user = userEvent.setup();
      setup(size);
      expect(sent()).toEqual(["size=m"]);
      await user.click(screen.getByText("L"));
      await user.click(screen.getByText("M"));
      expect(sent()).toEqual(["size=l"]);
    });

    it("is one Tab stop per option, in order", async () => {
      // Space on a checkbox inside its label is not tested here: happy-dom hands the key's click to
      // the label a second time and the box toggles twice. The atom's own test covers Space, and so
      // does the swatch's below, whose label is beside it.
      const user = userEvent.setup();
      setup(size);
      await user.tab();
      expect(document.activeElement).toBe(checkbox("XS, 5 products"));
      await user.tab();
      expect(document.activeElement).toBe(checkbox("S, 9 products"));
      expect(document.activeElement?.className).toContain("focus-visible:ring-ring");
    });

    it("gives every row a 44 px target, and lets a long name wrap", () => {
      setup(size);
      for (const row of document.querySelectorAll("[data-slot=label]")) {
        expect(row.className).toContain("min-h-11");
      }
      const name = checkbox("M, 11 products").closest("label")?.querySelector("span.flex-1");
      expect(name?.className).toContain("wrap-anywhere");
      expect(name?.className).toContain("min-w-0");
    });

    it("disables an option nothing is left in, and mutes it", () => {
      setup({
        ...size,
        options: size.options.map((option) =>
          option.value === "xs" ? { ...option, count: 0 } : option,
        ),
      });
      const dead = checkbox("XS, 0 products");
      expect(dead.hasAttribute("data-disabled")).toBe(true);
      expect(dead.closest("label")?.className).toContain("has-data-disabled:text-muted-foreground");
      expect(checkbox("S, 9 products").hasAttribute("data-disabled")).toBe(false);
    });

    it("never disables a chosen option, so a stale link's filter can be taken off", async () => {
      const user = userEvent.setup();
      setup({
        ...size,
        options: size.options.map((option) =>
          option.value === "m" ? { ...option, count: 0 } : option,
        ),
      });
      const stale = checkbox("M, 0 products");
      expect(stale.hasAttribute("data-disabled")).toBe(false);
      expect(stale.getAttribute("aria-checked")).toBe("true");
      await user.click(stale);
      expect(sent()).toEqual([]);
    });

    it("hides the legend from sight, not from the group's name, with hideLegend", () => {
      setup(size, "en", { hideLegend: true });
      const group = screen.getByRole("group", { name: "Size" });
      expect(group.querySelector("legend")?.className).toContain("sr-only");
    });

    it("passes className, data attributes and the rest to its root, and marks the kind", () => {
      setup(size, "en", { className: "mt-4", "data-testid": "root" } as Partial<FilterGroupProps>);
      const root = screen.getByTestId("root");
      expect(root.getAttribute("data-slot")).toBe("filter-group");
      expect(root.getAttribute("data-kind")).toBe("checkbox");
      expect(root.className).toContain("mt-4");
    });
  });

  describe("Show more", () => {
    const category = facetOf("en", "category", "checkbox");

    it("shows the first six options and puts the rest in a closed disclosure", () => {
      setup(category);
      const more = document.querySelector("details[data-slot=filter-more]") as HTMLDetailsElement;
      expect(more.open).toBe(false);
      expect(more.querySelectorAll("[role=checkbox]")).toHaveLength(2);
      expect(document.querySelectorAll("[role=checkbox]")).toHaveLength(category.options.length);
    });

    it("names the summary 'Show 2 more' and the group it belongs to", () => {
      setup(category);
      const summary = document.querySelector("summary") as HTMLElement;
      expect(summary.textContent).toContain("Show 2 more");
      expect(summary.textContent).toContain("Show fewer");
      expect(summary.textContent).toContain(", Category");
      // A 44 px target.
      expect(summary.className).toContain("min-h-11");
    });

    it("shows 'Show fewer' instead when the disclosure is open, by CSS on the native state", () => {
      setup(category);
      const [more, fewer] = [...document.querySelectorAll("summary > span")];
      expect(more?.className).toContain("group-open/more:hidden");
      expect(fewer?.className).toContain("hidden");
      expect(fewer?.className).toContain("group-open/more:inline");
    });

    it("opens and closes with a click on the summary, native to the browser", async () => {
      const user = userEvent.setup();
      setup(category);
      const more = document.querySelector("details") as HTMLDetailsElement;
      await user.click(document.querySelector("summary") as HTMLElement);
      expect(more.open).toBe(true);
      await user.click(document.querySelector("summary") as HTMLElement);
      expect(more.open).toBe(false);
    });

    it("sends the fields behind the closed disclosure like the others", () => {
      setup({
        ...category,
        options: category.options.map((option) =>
          option.value === "caps" ? { ...option, selected: true } : option,
        ),
      });
      expect(sent()).toContain("category=caps");
    });

    it("opens by itself when a chosen option is behind it", () => {
      setup({
        ...category,
        options: category.options.map((option) =>
          option.value === "ankle-socks" ? { ...option, selected: true } : option,
        ),
      });
      expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(true);
    });

    it("stays closed when the chosen options are all in front of it", () => {
      setup(category);
      expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(false);
    });

    it("has no disclosure for options up to the limit", () => {
      setup(facetOf("en", "size", "checkbox"));
      expect(document.querySelector("details")).toBeNull();
      expect(document.querySelector("summary")).toBeNull();
    });

    it("follows `limit`", () => {
      setup(category, "en", { limit: 3 });
      expect(document.querySelectorAll("details [role=checkbox]")).toHaveLength(5);
      expect(document.querySelector("summary")?.textContent).toContain("Show 5 more");
    });

    it("works before the page has scripts: a fieldset, a details and named inputs in the markup", () => {
      const markup = renderToStaticMarkup(
        <form>
          <FilterGroup {...props(category)} />
        </form>,
      );
      document.body.innerHTML = markup;
      expect(document.querySelector("fieldset > legend")?.textContent).toBe("Category");
      expect(document.querySelector("details > summary")).toBeTruthy();
      const inputs = [...document.querySelectorAll<HTMLInputElement>("input[name=category]")];
      expect(inputs.map((input) => input.value)).toEqual(category.options.map((o) => o.value));
      expect(inputs.filter((input) => input.checked).map((input) => input.value)).toEqual([
        "hoodies",
      ]);
    });
  });

  describe("a swatch facet", () => {
    const colour = facetOf("en", "colour", "swatch");

    it("is a group with a checkbox per colour, drawn as a swatch with its name beside it", () => {
      setup(colour);
      const group = screen.getByRole("group", { name: colour.label });
      const boxes = within(group).getAllByRole("checkbox");
      expect(boxes).toHaveLength(colour.options.length);
      for (const box of boxes) {
        expect(box.getAttribute("data-slot")).toBe("swatch");
        // A swatch is a button; as a checkbox it carries `aria-checked`, and `aria-pressed` is not
        // allowed on the role.
        expect(box.hasAttribute("aria-pressed")).toBe(false);
        expect(box.tagName).toBe("BUTTON");
      }
    });

    it("names a colour by the visible text beside it, with its count: 'Black, 8 products'", () => {
      setup(colour);
      expect(checkbox("Black, 8 products")).toBeTruthy();
      expect(checkbox("Forest green, 5 products")).toBeTruthy();
      const row = checkbox("Black, 8 products").closest("[data-slot=filter-swatch-option]");
      expect(row?.textContent).toContain("Black");
      expect(row?.textContent).toContain("8");
    });

    it("draws the colour as the swatch's disc, from the facet's hex", () => {
      setup(colour);
      const disc = checkbox("Black, 8 products").querySelector("span[style]") as HTMLElement;
      expect(disc.style.backgroundColor).not.toBe("");
    });

    it("marks the chosen colours as checked and gives them a thick edge", () => {
      setup(colour);
      expect(checked("Black, 8 products")).toBe("true");
      expect(checked("Forest green, 5 products")).toBe("true");
      expect(checked("White, 3 products")).toBe("false");
      const classes = checkbox("Black, 8 products").className;
      expect(classes).toContain("data-checked:border-2");
      expect(classes).toContain("data-checked:border-primary");
    });

    it("sends the chosen colours under the facet's id", () => {
      setup(colour);
      expect(sent()).toEqual(["colour=black", "colour=forest"]);
    });

    it("toggles when the swatch or the words beside it are clicked", async () => {
      const user = userEvent.setup();
      setup(colour);
      await user.click(checkbox("White, 3 products"));
      expect(sent()).toEqual(["colour=black", "colour=white", "colour=forest"]);
      await user.click(screen.getByText("Black", { selector: "label span" }));
      expect(sent()).toEqual(["colour=white", "colour=forest"]);
    });

    it("toggles with Space on the swatch, and Tab reaches it", async () => {
      const user = userEvent.setup();
      setup(colour);
      await user.tab();
      expect(document.activeElement).toBe(checkbox("Black, 8 products"));
      await user.keyboard(" ");
      expect(checked("Black, 8 products")).toBe("false");
    });

    it("keeps a 44 px row and lets a long colour name wrap", () => {
      setup(colour);
      const row = document.querySelector("[data-slot=filter-swatch-option]") as HTMLElement;
      expect(row.className).toContain("min-h-11");
      expect(row.querySelector("label")?.className).toContain("min-h-11");
      expect(row.querySelector("label span")?.className).toContain("wrap-anywhere");
    });

    it("disables a colour nothing is left in, but not a chosen one", () => {
      setup({
        ...colour,
        options: colour.options.map((option) =>
          option.value === "white" || option.value === "black" ? { ...option, count: 0 } : option,
        ),
      });
      expect(checkbox("White, 0 products").hasAttribute("disabled")).toBe(true);
      expect(checkbox("Black, 0 products").hasAttribute("disabled")).toBe(false);
      expect(
        checkbox("White, 0 products").closest("div")?.querySelector("label")?.className,
      ).toContain("text-muted-foreground");
    });

    it("also folds the colours past the limit behind Show more", () => {
      setup(colour, "en", { limit: 4 });
      expect(document.querySelector("summary")?.textContent).toContain("Show 4 more");
      expect(document.querySelectorAll("details [role=checkbox]")).toHaveLength(4);
      // Forest green is the sixth, so it is behind the disclosure and opens it.
      expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(true);
    });
  });

  describe("a range facet", () => {
    const price = facetOf("en", "price", "range");

    it("is a group named by its legend, with a slider of two thumbs and two number fields", () => {
      setup(price);
      const group = screen.getByRole("group", { name: "Price" });
      expect(within(group).getAllByRole("slider", { hidden: true })).toHaveLength(2);
      const fields = within(group).getAllByRole("spinbutton");
      expect(fields.map((field) => field.getAttribute("name"))).toEqual(["price.min", "price.max"]);
    });

    it("fills the fields with the chosen range and sends them", () => {
      setup(price);
      const { min, max } = price.selected ?? { min: 0, max: 0 };
      expect(sent()).toEqual([`price.min=${min}`, `price.max=${max}`]);
      expect(screen.getByRole("spinbutton", { name: "Minimum price" })).toBeTruthy();
      expect(screen.getByRole("spinbutton", { name: "Maximum price" })).toBeTruthy();
    });

    it("says what the ends are in the market's money, and the fields are described by it", () => {
      setup(price);
      const bounds = document.querySelector("[data-slot=filter-range-bounds]") as HTMLElement;
      expect(bounds.textContent).toBe("Prices from $0.00 to $165.00");
      const field = screen.getByRole("spinbutton", { name: "Minimum price" });
      expect(field.getAttribute("aria-describedby")).toBe(bounds.id);
    });

    it("sends empty fields for a range nobody has chosen", () => {
      setup({ ...price, selected: undefined });
      expect(sent()).toEqual(["price.min=", "price.max="]);
    });

    it("has no fieldset of options and no Show more", () => {
      setup(price);
      expect(document.querySelector("details")).toBeNull();
      expect(document.querySelector("[role=checkbox]")).toBeNull();
    });
  });

  describe("a toggle facet", () => {
    const inStock = facetOf("en", "in-stock", "toggle");

    it("is a switch named by its label and count, in a label, with no group around it", () => {
      setup(inStock);
      expect(screen.queryByRole("group")).toBeNull();
      expect(document.querySelector("legend")).toBeNull();
      const toggle = switchOf("In stock, 11 products");
      expect(toggle.getAttribute("aria-checked")).toBe("true");
      expect(toggle.closest("label")?.className).toContain("min-h-11");
    });

    it("sends the facet's id with the value 1 when it is on, and nothing when off", async () => {
      const user = userEvent.setup();
      setup(inStock);
      expect(sent()).toEqual([`in-stock=${TOGGLE_VALUE}`]);
      expect(TOGGLE_VALUE).toBe("1");
      await user.click(screen.getByRole("switch"));
      expect(sent()).toEqual([]);
      await user.click(screen.getByText("In stock"));
      expect(sent()).toEqual(["in-stock=1"]);
    });

    it("starts off when it is not chosen, and a click turns it on", async () => {
      const user = userEvent.setup();
      const onSale = facetOf("en", "on-sale", "toggle");
      setup(onSale);
      expect(switchOf("On sale, 1 product").getAttribute("aria-checked")).toBe("false");
      expect(sent()).toEqual([]);
      await user.click(screen.getByRole("switch"));
      expect(sent()).toEqual(["on-sale=1"]);
    });

    it("disables a filter nothing is left in, but not a chosen one", () => {
      const dead: ToggleFacet = { ...inStock, selected: false, count: 0 };
      const { unmount } = setup(dead);
      expect(switchOf("In stock, 0 products").hasAttribute("data-disabled")).toBe(true);
      unmount();
      setup({ ...inStock, count: 0 });
      expect(switchOf("In stock, 0 products").hasAttribute("data-disabled")).toBe(false);
    });
  });

  describe("in each locale", () => {
    it.each(LOCALES)(
      "%s: the legend, the counts and Show more are in the locale's words",
      (locale) => {
        const copy = catalogs[locale].molecules.filterGroup;
        const category = facetOf(locale, "category", "checkbox");
        setup(category, locale);
        expect(screen.getByRole("group", { name: category.label })).toBeTruthy();
        expect(document.querySelector("summary")?.textContent).toContain(copy.showFewer);
        // "Show 2 more" in the locale: the catalog's message with the count in it.
        expect(document.querySelector("summary")?.textContent).toMatch(/2/);
        const first = category.options[0] as CheckboxFacet["options"][number];
        const row = screen.getByText(first.label).closest("label") as HTMLElement;
        expect(row.textContent).toContain(String(first.count));
        expect(row.textContent).toMatch(/\d\D+/);
      },
    );

    it.each(LOCALES)("%s: the price range's fields are named in the locale's words", (locale) => {
      const copy = catalogs[locale].molecules.filterGroup;
      setup(facetOf(locale, "price", "range"), locale);
      expect(screen.getByRole("spinbutton", { name: copy.minimum })).toBeTruthy();
      expect(screen.getByRole("spinbutton", { name: copy.maximum })).toBeTruthy();
      expect(screen.getByText(/\d/, { selector: "[data-slot=filter-range-bounds]" })).toBeTruthy();
    });

    it.each(LOCALES)("%s: the toggles are switches named by the facet", (locale) => {
      const toggle = facetOf(locale, "in-stock", "toggle");
      setup(toggle, locale);
      const catalog = catalogs[locale].molecules.filterGroup;
      const products = formatMessage(catalog.products, { count: toggle.count }, htmlLang(locale));
      expect(switchOf(`${toggle.label}, ${products}`).getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("long German and Greek names", () => {
    it.each(longLabels.map(([locale]) => locale))(
      "%s: wraps every name and draws it whole, with no class that would cut it",
      (locale) => {
        const facet = longCheckboxFacet(locale);
        setup(facet, locale, { limit: 50 });
        for (const option of facet.options) {
          expect(screen.getByText(option.label)).toBeTruthy();
        }
        for (const element of document.querySelectorAll("*")) {
          expect(String(element.getAttribute("class"))).not.toMatch(CLIPPING_CLASSES);
        }
        const names = [...document.querySelectorAll("label > span.flex-1")];
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) expect(name.className).toContain("wrap-anywhere");
        expect(document.querySelector("legend")?.className).toContain("wrap-anywhere");
      },
    );

    it.each(longLabels.map(([locale]) => locale))(
      "%s: does the same for long swatch names",
      (locale) => {
        const base = longCheckboxFacet(locale);
        const facet: SwatchFacet = {
          ...base,
          kind: "swatch",
          options: base.options.map((option) => ({ ...option, hex: "#336699" })),
        };
        setup(facet, locale, { limit: 50 });
        for (const option of facet.options) {
          // A swatch also says its name to assistive technology, inside the disc.
          expect(screen.getAllByText(option.label).length).toBeGreaterThan(0);
        }
        for (const element of document.querySelectorAll("*")) {
          expect(String(element.getAttribute("class"))).not.toMatch(CLIPPING_CLASSES);
        }
        for (const name of document.querySelectorAll(
          "[data-slot=filter-swatch-option] label span",
        )) {
          if (name.getAttribute("aria-hidden") === "true" || name.className === "sr-only") continue;
          expect(name.className).toContain("wrap-anywhere");
        }
      },
    );

    it.each(longLabels.map(([locale]) => locale))("%s: wraps a long toggle label", (locale) => {
      const { options } = commerceFixtures[locale].long.cartLine;
      const label = options.map((option) => option.value).join(" ");
      const toggle: ToggleFacet = { kind: "toggle", id: "long", label, count: 3, selected: false };
      setup(toggle, locale);
      expect(screen.getByText(label).className).toContain("wrap-anywhere");
      expect(screen.getByRole("switch").closest("label")?.className).not.toMatch(CLIPPING_CLASSES);
    });
  });

  describe("the classes", () => {
    it("uses tokens and logical properties only", () => {
      for (const file of [source, rangeSource, swatchSource]) {
        expect(file).not.toMatch(/(?:^|[\s"'`:])(?:ml|mr|pl|pr|left|right|text-left|text-right)-/);
        expect(file).not.toMatch(/(?:^|[\s"'`:])dark:/);
        expect(file).not.toMatch(/ring-ring\/\d/);
        expect(file).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(/);
      }
    });
  });
});
