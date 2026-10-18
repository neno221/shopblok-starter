import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { ActiveFilters } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { ActiveFilterChips, type ActiveFilterChipsProps } from "./active-filter-chips";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: React.ComponentProps<"a"> & { prefetch?: boolean | null }) => (
    <a href={String(href)} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

const source = readFileSync(path.join(import.meta.dirname, "active-filter-chips.tsx"), "utf8");

function props(locale: Locale = "en", active?: ActiveFilters): ActiveFilterChipsProps {
  const fixture = commerceFixtures[locale];
  return {
    active: active ?? fixture.activeFilters,
    copy: catalogs[locale].molecules.activeFilterChips,
    locale: fixture.market.htmlLang,
  };
}

function setup(
  locale: Locale = "en",
  active?: ActiveFilters,
  extra: Partial<ActiveFilterChipsProps> = {},
) {
  return render(<ActiveFilterChips {...props(locale, active)} {...extra} />);
}

const list = () => screen.getByRole("list");
const link = (name: string) => screen.getByRole("link", { name });

describe("ActiveFilterChips", () => {
  describe("the file", () => {
    it("is a server component that fetches nothing and builds no URL", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect(source).not.toMatch(/\bfetch\(|URLSearchParams|new URL\(|location\./);
      expect(source).not.toMatch(/^import (?!type\b)[^;]*@shopblok\/registry/m);
    });
  });

  describe("the list", () => {
    it("is a list named by how many filters it holds", () => {
      setup();
      expect(list().getAttribute("aria-label")).toBe("6 active filters");
      expect(list().tagName).toBe("UL");
      expect(list().getAttribute("role")).toBe("list");
    });

    it("says '1 active filter' for one", () => {
      const { filters, clearHref } = commerceFixtures.en.activeFilters;
      setup("en", { filters: filters.slice(0, 1), clearHref });
      expect(list().getAttribute("aria-label")).toBe("1 active filter");
    });

    it("has an item for each chip and a last one for Clear all", () => {
      setup();
      const items = within(list()).getAllByRole("listitem");
      expect(items).toHaveLength(7);
      expect(items.at(-1)?.textContent).toBe("Clear all");
      for (const item of items.slice(0, -1)) {
        expect(item.querySelector("[data-slot=chip]")).toBeTruthy();
      }
    });

    it("draws nothing when no filter is applied", () => {
      const { clearHref } = commerceFixtures.en.activeFilters;
      const { container } = setup("en", { filters: [], clearHref });
      expect(container.firstChild).toBeNull();
    });

    it("wraps its chips in rows, with a row gap as tall as the remove links reach", () => {
      setup();
      expect(list().className).toContain("flex-wrap");
      // A chip is 32 px and its remove link 44: 6 px out each way. 12 px between rows means the
      // links of two rows touch and do not overlap.
      expect(list().className).toContain("gap-y-3");
    });

    it("passes className and the rest of its props to the list, and marks it", () => {
      setup("en", undefined, { className: "mt-4", id: "chips" });
      expect(list().id).toBe("chips");
      expect(list().className).toContain("mt-4");
      expect(list().getAttribute("data-slot")).toBe("active-filter-chips");
    });
  });

  describe("a chip", () => {
    it("says the group and the value: 'Color: Black'", () => {
      setup();
      const texts = [...document.querySelectorAll("[data-slot=chip]")].map(
        (chip) => chip.firstElementChild?.textContent,
      );
      expect(texts).toEqual([
        "Category: Hoodies",
        "Color: Black",
        "Color: Forest green",
        "Size: M",
        "Price: $22 to $110",
        "In stock",
      ]);
    });

    it("has a remove link named with the whole chip, so the chips can be told apart", () => {
      setup();
      expect(link("Remove Color: Black")).toBeTruthy();
      expect(link("Remove Color: Forest green")).toBeTruthy();
      expect(link("Remove In stock")).toBeTruthy();
    });

    it("sends the remove link to the listing without that value", () => {
      setup();
      const { filters } = commerceFixtures.en.activeFilters;
      for (const filter of filters) {
        const text = filter.group === undefined ? filter.label : `${filter.group}: ${filter.label}`;
        expect(link(`Remove ${text}`).getAttribute("href")).toBe(filter.removeHref);
      }
    });

    it("says an on/off filter by its label alone, with no group in front", () => {
      const { clearHref } = commerceFixtures.en.activeFilters;
      setup("en", {
        filters: [{ id: "in-stock", label: "In stock", removeHref: "/store" }],
        clearHref,
      });
      expect(screen.getByText("In stock")).toBeTruthy();
      expect(document.body.textContent).not.toContain(": ");
      expect(link("Remove In stock")).toBeTruthy();
    });

    it("is one chip for each filter, in the order given", () => {
      setup();
      const { filters } = commerceFixtures.en.activeFilters;
      expect(document.querySelectorAll("[data-slot=chip]")).toHaveLength(filters.length);
    });

    it("has a 44 px remove link in a chip that stays 32 px", () => {
      setup();
      const remove = link("Remove Size: M");
      expect(remove.className).toContain("size-11");
      expect(remove.className).toContain("-my-1.5");
      expect(remove.className).toContain("focus-visible:ring-ring");
      expect(remove.className).not.toMatch(/ring-ring\//);
      expect(remove.closest("[data-slot=chip]")?.className).toContain("min-h-8");
    });

    it("keeps its link out of any other link or button", () => {
      setup();
      for (const anchor of document.querySelectorAll("a")) {
        expect(anchor.parentElement?.closest("a, button")).toBeNull();
        expect(anchor.querySelector("a, button, input")).toBeNull();
      }
    });
  });

  describe("Clear all", () => {
    it("is a link to the listing without any filter", () => {
      setup();
      expect(link("Clear all filters").getAttribute("href")).toBe(
        commerceFixtures.en.activeFilters.clearHref,
      );
    });

    it("shows 'Clear all' and is named 'Clear all filters', which holds the words on screen", () => {
      setup();
      const clear = link("Clear all filters");
      expect(clear.textContent).toBe("Clear all");
      expect(clear.getAttribute("aria-label")).toContain(clear.textContent);
    });

    it("is a 44 px target with the ring at full strength", () => {
      setup();
      const clear = link("Clear all filters");
      expect(clear.className).toContain("min-h-11");
      expect(clear.className).toContain("focus-visible:ring-ring");
      expect(clear.className).not.toMatch(/ring-ring\//);
    });
  });

  describe("prefetch", () => {
    it("is left to Next unless the caller says", () => {
      setup();
      for (const anchor of document.querySelectorAll("a")) {
        expect(anchor.getAttribute("data-prefetch")).toBe("undefined");
      }
    });

    it("turns prefetching off for every link with prefetch={false}", () => {
      setup("en", undefined, { prefetch: false });
      const anchors = document.querySelectorAll("a");
      expect(anchors).toHaveLength(7);
      for (const anchor of anchors) expect(anchor.getAttribute("data-prefetch")).toBe("false");
    });
  });

  describe("the keyboard", () => {
    it("tabs through each chip's remove link, then Clear all, in the order of the chips", async () => {
      const user = userEvent.setup();
      setup();
      const order: (string | null)[] = [];
      for (let step = 0; step < 7; step += 1) {
        await user.tab();
        order.push(document.activeElement?.getAttribute("aria-label") ?? null);
      }
      expect(order).toEqual([
        "Remove Category: Hoodies",
        "Remove Color: Black",
        "Remove Color: Forest green",
        "Remove Size: M",
        "Remove Price: $22 to $110",
        "Remove In stock",
        "Clear all filters",
      ]);
    });
  });

  describe("in each locale", () => {
    it.each(LOCALES)(
      "%s: names the list, the chips and the links in the locale's words",
      (locale) => {
        const copy = catalogs[locale].molecules.activeFilterChips;
        const { activeFilters, market } = commerceFixtures[locale];
        setup(locale);
        expect(list().getAttribute("aria-label")).toBe(
          formatMessage(copy.label, { count: activeFilters.filters.length }, market.htmlLang),
        );
        for (const filter of activeFilters.filters) {
          const text =
            filter.group === undefined
              ? filter.label
              : formatMessage(
                  copy.chip,
                  { group: filter.group, label: filter.label },
                  market.htmlLang,
                );
          // The default normaliser would turn the French no-break space into a plain one.
          expect(screen.getByText(text, { normalizer: (value) => value })).toBeTruthy();
          expect(link(formatMessage(copy.remove, { filter: text }, market.htmlLang))).toBeTruthy();
        }
        expect(link(copy.clearAllLabel).textContent).toBe(copy.clearAll);
        // WCAG 2.5.3 (Label in Name, T37): the name holds the words the eye sees, so a reader who
        // says "click Clear all" reaches it. axe's label-content-name-mismatch found de and fr.
        expect(copy.clearAllLabel.toLocaleLowerCase(market.htmlLang)).toContain(
          copy.clearAll.toLocaleLowerCase(market.htmlLang),
        );
      },
    );

    it("fr: sets the colon after a no-break space, as French does", () => {
      setup("fr");
      const first = document.querySelector("[data-slot=chip]")?.firstElementChild?.textContent;
      expect(first).toMatch(/\S\u00a0: \S/);
    });
  });

  describe("long German and Greek names", () => {
    it.each(longLabels.map(([locale]) => locale))(
      "%s: wraps a chip whose group and value are long, and keeps its remove link whole",
      (locale) => {
        const { title, options } = commerceFixtures[locale].long.cartLine;
        const group = options[0]?.option ?? title;
        const label = options[0]?.value ?? title;
        const { clearHref } = commerceFixtures[locale].activeFilters;
        setup(locale, {
          filters: [
            { id: "long:1", group, label, removeHref: "/store?x=1" },
            { id: "long:2", label: title, removeHref: "/store?x=2" },
          ],
          clearHref,
        });
        for (const element of document.querySelectorAll("*")) {
          expect(String(element.getAttribute("class"))).not.toMatch(CLIPPING_CLASSES);
        }
        const chips = [...document.querySelectorAll("[data-slot=chip]")] as HTMLElement[];
        expect(chips).toHaveLength(2);
        for (const chip of chips) {
          expect(chip.className).toContain("max-w-full");
          expect(chip.firstElementChild?.className).toContain("wrap-anywhere");
          expect(chip.parentElement?.className).toContain("min-w-0");
          expect(chip.parentElement?.className).toContain("max-w-full");
        }
        expect(chips[0]?.textContent).toContain(group);
        expect(chips[0]?.textContent).toContain(label);
        expect(chips[1]?.textContent).toBe(title);
        // The remove links are 44 px and stay in the chip's row, however long the text.
        for (const remove of document.querySelectorAll("[data-slot=chip-remove]")) {
          expect(remove.className).toContain("shrink-0");
          expect(remove.className).toContain("size-11");
        }
      },
    );
  });
});
