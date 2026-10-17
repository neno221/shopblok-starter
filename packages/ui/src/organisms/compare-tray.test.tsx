// Ours (T37, SETUP.md "Listing organisms (T37)"). The tests of CompareTray, in happy-dom with
// Testing Library: nothing drawn without products, the region and its parts in the four locales,
// the count and the "choose more" line, when the compare link is there, the empty places, the
// removal (the callbacks, and where focus goes next), the height reserved at the end of the page,
// the box (fixed to the bottom, on the overlay layer, clear of the home indicator), the 44 px
// buttons, a long German and Greek title, the prefetch every link takes, and the file's classes.
// - The page owns the products, so most tests render the tray inside `Page`, which keeps them in
//   state and removes one when `onRemove` says so, as the page's island will (M5).
// - Pixels are not measurable here: the tray's height and wrapping at 375, 768 and 1440 px in
//   English, German and Greek were measured in headless Chromium, and the design system's own
//   browser checks (axe, 44 px targets, no sideways scroll) are the lead's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { CompareItem } from "@shopblok/registry/contracts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { CompareTray, type CompareTrayProps } from "./compare-tray";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);

type Fixture = Pick<CompareTrayProps, "items" | "max" | "compareHref">;
const states = (locale: Locale) => commerceFixtures[locale].listing.compare;
const copyOf = (locale: Locale) => catalogs[locale].organisms.compareTray;

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const all = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const tokens = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");

function element(locale: Locale, fixture: Fixture, props: Partial<CompareTrayProps> = {}) {
  return (
    <CompareTray
      {...fixture}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}
const setup = (locale: Locale, fixture: Fixture, props?: Partial<CompareTrayProps>) =>
  render(element(locale, fixture, props));

/**
 * The page: a control before the tray, the tray with the products in state, and a link after it, so
 * that "where the next Tab would have gone" is something to point at.
 */
function Page({
  locale = "en",
  fixture,
  props,
}: {
  locale?: Locale;
  fixture: Fixture;
  props?: Partial<CompareTrayProps>;
}) {
  const [items, setItems] = useState(fixture.items);
  return (
    <>
      <button type="button">Before</button>
      {element(
        locale,
        { ...fixture, items },
        {
          onRemove: (id) => setItems((list) => list.filter((item) => item.id !== id)),
          onClear: () => setItems([]),
          ...props,
        },
      )}
      <a href="/after">After</a>
    </>
  );
}

const removeButtons = () => all("compare-tray-remove");
const removeOf = (locale: Locale, title: string) =>
  screen.getByRole("button", {
    name: formatMessage(copyOf(locale).remove, { title }, htmlLang[locale]),
  });
const click = (button: HTMLElement) => act(() => void fireEvent.click(button));
const focused = () => document.activeElement as HTMLElement | null;
const countText = (locale: Locale, count: number, max: number) =>
  formatMessage(copyOf(locale).count, { count, max }, htmlLang[locale]);
const needMoreText = (locale: Locale, count: number) =>
  formatMessage(copyOf(locale).needMore, { count }, htmlLang[locale]);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("style");
});

describe("CompareTray", () => {
  describe("with no products", () => {
    it("draws nothing at all: not a region, not an empty box, not the actions", () => {
      const { container } = setup("en", { items: [], max: 4, compareHref: "/us/compare" });
      expect(container.innerHTML).toBe("");
      expect(screen.queryByRole("region")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("draws nothing until there is a product, and goes again when the last one is removed", () => {
      render(<Page fixture={{ ...states("en").one }} />);
      expect(screen.getByRole("region", { name: copyOf("en").region })).toBeTruthy();
      click(removeButtons()[0] as HTMLElement);
      expect(slot("compare-tray")).toBeNull();
    });
  });

  describe.each(LOCALES)("the tray · %s", (locale) => {
    it("is a region named by the catalog, fixed to the bottom of the window", () => {
      setup(locale, states(locale).three);
      const region = screen.getByRole("region", { name: copyOf(locale).region });
      expect(region).toBe(slot("compare-tray"));
      expect(region.tagName).toBe("SECTION");
      // Not a dialog: it takes no focus when it appears, and the page behind it stays usable.
      expect(region.getAttribute("role")).toBeNull();
      expect(region.hasAttribute("aria-modal")).toBe(false);
      expect(document.activeElement).toBe(document.body);
    });

    it("shows each product: its picture, its title as a link, and a button that removes it", () => {
      const fixture = states(locale).three;
      setup(locale, fixture);
      const list = within(slot("compare-tray") as HTMLElement).getByRole("list");
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(fixture.items.length);
      for (const [index, item] of items.entries()) {
        const product = fixture.items[index] as CompareItem;
        const link = within(item).getByRole("link", { name: product.title });
        expect(link.getAttribute("href")).toBe(product.href);
        expect(link.querySelector("img")?.getAttribute("alt")).toBe("");
        expect(
          within(item).getByRole("button", {
            name: formatMessage(copyOf(locale).remove, { title: product.title }, htmlLang[locale]),
          }),
        ).toBe(removeButtons()[index]);
      }
    });

    it("says how many are chosen, as a polite status, and what is left to choose", () => {
      setup(locale, states(locale).one);
      const status = screen.getByRole("status");
      expect(status).toBe(slot("compare-tray-status"));
      expect(slot("compare-tray-count")?.textContent).toBe(countText(locale, 1, 4));
      expect(slot("compare-tray-need-more")?.textContent).toBe(needMoreText(locale, 1));
      expect(status.contains(slot("compare-tray-count"))).toBe(true);
      expect(status.contains(slot("compare-tray-need-more"))).toBe(true);
    });

    it("has the compare link when two or more are chosen, and the catalog's word for it", () => {
      const fixture = states(locale).three;
      setup(locale, fixture);
      const link = screen.getByRole("link", { name: copyOf(locale).compare });
      expect(link.getAttribute("href")).toBe(fixture.compareHref);
      expect(link).toBe(slot("compare-tray-compare"));
      expect(slot("compare-tray-need-more")).toBeNull();
      expect(slot("compare-tray-count")?.textContent).toBe(countText(locale, 3, 4));
    });

    it("has a button that removes them all, named by the catalog", () => {
      setup(locale, states(locale).three);
      expect(screen.getByRole("button", { name: copyOf(locale).clear })).toBe(
        slot("compare-tray-clear"),
      );
    });
  });

  describe("the compare link and the line that stands in its place", () => {
    it("waits for a second product: one chosen, the line says how many more, and no link", () => {
      setup("en", states("en").one);
      expect(screen.queryByRole("link", { name: "Compare" })).toBeNull();
      expect(slot("compare-tray-compare")).toBeNull();
      expect(slot("compare-tray-need-more")?.textContent).toBe("Choose 1 more product to compare");
    });

    it("appears at two, and the line goes", () => {
      const fixture = states("en").three;
      setup("en", { ...fixture, items: fixture.items.slice(0, 2) });
      expect(slot("compare-tray-compare")).toBeTruthy();
      expect(slot("compare-tray-need-more")).toBeNull();
      expect(slot("compare-tray-count")?.textContent).toBe("2 of 4 chosen");
    });

    it("is a link that looks like a button, and Remove all is a button that looks like a button", () => {
      setup("en", states("en").three);
      expect(slot("compare-tray-compare")?.tagName).toBe("A");
      expect(tokens(slot("compare-tray-compare"))).toContain("bg-primary");
      expect(slot("compare-tray-clear")?.tagName).toBe("BUTTON");
      expect(slot("compare-tray-clear")?.getAttribute("type")).toBe("button");
    });
  });

  describe("the places left", () => {
    it("shows an empty slot for each place up to the most, and hides them from a screen reader", () => {
      setup("en", states("en").three);
      const slots = all("compare-tray-slot");
      expect(slots).toHaveLength(1);
      for (const empty of slots) {
        expect(empty.getAttribute("aria-hidden")).toBe("true");
        expect(empty.textContent).toBe("");
        expect(empty.querySelector("a, button, input")).toBeNull();
      }
      // A screen reader hears the chosen products, and not the places.
      expect(screen.getAllByRole("listitem")).toHaveLength(3);
    });

    it("shows three for one product, and none when the tray is full", () => {
      const view = setup("en", states("en").one);
      expect(all("compare-tray-slot")).toHaveLength(3);
      view.unmount();
      setup("en", states("en").full);
      expect(all("compare-tray-slot")).toHaveLength(0);
      expect(slot("compare-tray-count")?.textContent).toBe("4 of 4 chosen");
      expect(screen.getAllByRole("listitem")).toHaveLength(4);
    });

    it("follows a most of 2 or 3, and a most that the contract would not allow still has columns", () => {
      const three = states("en").three;
      const view = setup("en", { ...three, items: three.items.slice(0, 2), max: 3 });
      expect(all("compare-tray-slot")).toHaveLength(1);
      expect(tokens(slot("compare-tray-items"))).toContain(
        "lg:grid-cols-[repeat(3,minmax(0,16rem))]",
      );
      view.unmount();
      const two = setup("en", { ...three, items: three.items.slice(0, 2), max: 2 });
      expect(all("compare-tray-slot")).toHaveLength(0);
      expect(tokens(slot("compare-tray-items"))).toContain(
        "lg:grid-cols-[repeat(2,minmax(0,16rem))]",
      );
      two.unmount();
      setup("en", { ...three, max: 9 });
      expect(tokens(slot("compare-tray-items"))).toContain(
        "lg:grid-cols-[repeat(4,minmax(0,16rem))]",
      );
    });
  });

  describe("the box", () => {
    it("is fixed to the bottom of the window, on the overlay layer, and scrolls inside itself", () => {
      setup("en", states("en").three);
      const classes = tokens(slot("compare-tray"));
      for (const name of ["fixed", "inset-x-0", "bottom-0", "z-(--z-overlay)", "overflow-y-auto"]) {
        expect(classes).toContain(name);
      }
      expect(classes).toContain("max-h-[60dvh]");
      expect(classes).toContain("bg-background");
    });

    it("keeps its controls clear of a phone's home indicator", () => {
      setup("en", states("en").three);
      const inner = slot("compare-tray")?.firstElementChild as HTMLElement;
      expect(tokens(inner)).toContain("pb-[calc(0.75rem+env(safe-area-inset-bottom))]");
    });

    it("takes a className for the page to place it", () => {
      setup("en", states("en").three, { className: "lg:hidden" });
      expect(tokens(slot("compare-tray"))).toContain("lg:hidden");
    });
  });

  describe("the controls", () => {
    it("are 44 px: the remove buttons, Remove all and the compare link", () => {
      setup("en", states("en").three);
      for (const button of removeButtons()) expect(tokens(button)).toContain("size-11");
      // A word button is at least 44 px tall (`min-h-11`) and grows with its words.
      expect(tokens(slot("compare-tray-clear"))).toContain("min-h-11");
      expect(tokens(slot("compare-tray-compare"))).toContain("min-h-11");
    });

    it("keep the remove button out of the link: no control inside a control", () => {
      setup("en", states("en").full);
      for (const link of all("compare-tray-link")) {
        expect(link.querySelector("a, button, input, select, textarea, [tabindex]")).toBeNull();
        expect(link.closest("button")).toBeNull();
      }
      for (const button of removeButtons()) {
        expect(button.closest("a")).toBeNull();
        expect(button.querySelector("a, button")).toBeNull();
      }
    });

    it("name each remove button with its product, so that four of them are four things", () => {
      const fixture = states("en").full;
      setup("en", fixture);
      const names = removeButtons().map((button) => button.getAttribute("aria-label"));
      expect(names).toEqual(fixture.items.map((item) => `Remove ${item.title}`));
      expect(new Set(names).size).toBe(4);
    });
  });

  describe("a product without a picture", () => {
    it("draws a quiet box in its place, hidden from a screen reader, and keeps the link", () => {
      const fixture = states("en").three;
      const first = fixture.items[0] as CompareItem;
      const { image: _image, ...bare } = first;
      setup("en", { ...fixture, items: [bare, ...fixture.items.slice(1)] });
      expect(all("compare-tray-no-image")).toHaveLength(1);
      expect(slot("compare-tray-no-image")?.getAttribute("aria-hidden")).toBe("true");
      expect(document.querySelectorAll("img")).toHaveLength(2);
      expect(screen.getByRole("link", { name: first.title })).toBeTruthy();
    });

    it("gives a picture the width of its cell", () => {
      const fixture = states("en").three;
      setup("en", {
        ...fixture,
        items: fixture.items.map((item) => ({
          ...item,
          image:
            item.image === undefined ? undefined : { ...item.image, src: `/media/${item.id}.png` },
        })),
      });
      for (const image of document.querySelectorAll("img")) {
        expect(image.getAttribute("sizes")).toBe("(min-width: 640px) 56px, 80px");
      }
    });
  });

  describe("removing", () => {
    it("tells the page which product, by id, and does nothing else itself", () => {
      const onRemove = vi.fn();
      const fixture = states("en").three;
      setup("en", fixture, { onRemove });
      click(removeButtons()[1] as HTMLElement);
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith(fixture.items[1]?.id);
      // The page owns the products: until it changes them, the tray shows the same ones.
      expect(screen.getAllByRole("listitem")).toHaveLength(3);
    });

    it("tells the page when the visitor removes them all", () => {
      const onClear = vi.fn();
      const onRemove = vi.fn();
      setup("en", states("en").three, { onClear, onRemove });
      click(screen.getByRole("button", { name: "Remove all" }));
      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onRemove).not.toHaveBeenCalled();
    });

    it("works without callbacks: the buttons are there and do nothing", () => {
      setup("en", states("en").three);
      expect(() => {
        click(removeButtons()[0] as HTMLElement);
        click(screen.getByRole("button", { name: "Remove all" }));
      }).not.toThrow();
      expect(screen.getAllByRole("listitem")).toHaveLength(3);
    });

    it("updates the count, the line, the places and the link as the products go", () => {
      render(<Page fixture={states("en").three} />);
      expect(slot("compare-tray-count")?.textContent).toBe("3 of 4 chosen");
      click(removeButtons()[0] as HTMLElement);
      expect(slot("compare-tray-count")?.textContent).toBe("2 of 4 chosen");
      expect(slot("compare-tray-compare")).toBeTruthy();
      click(removeButtons()[0] as HTMLElement);
      expect(slot("compare-tray-count")?.textContent).toBe("1 of 4 chosen");
      expect(slot("compare-tray-compare")).toBeNull();
      expect(slot("compare-tray-need-more")?.textContent).toBe(needMoreText("en", 1));
      expect(all("compare-tray-slot")).toHaveLength(3);
    });
  });

  describe("focus after a removal (a removed button drops focus on the body)", () => {
    const three = () => states("en").three;
    const titles = () => three().items.map((item) => item.title);

    function removeWithFocus(index: number) {
      const button = removeButtons()[index] as HTMLElement;
      act(() => button.focus());
      expect(focused()).toBe(button);
      click(button);
    }

    it("goes to the next product's remove button when the first goes", () => {
      render(<Page fixture={three()} />);
      removeWithFocus(0);
      expect(focused()).toBe(removeOf("en", titles()[1] as string));
    });

    it("goes to the next product's remove button when one in the middle goes", () => {
      render(<Page fixture={three()} />);
      removeWithFocus(1);
      expect(focused()).toBe(removeOf("en", titles()[2] as string));
    });

    it("goes to the previous product's remove button when the last goes", () => {
      render(<Page fixture={three()} />);
      removeWithFocus(2);
      expect(focused()).toBe(removeOf("en", titles()[1] as string));
    });

    it("goes to where the next Tab would have gone when the only product goes, and the tray with it", () => {
      render(<Page fixture={states("en").one} />);
      removeWithFocus(0);
      expect(slot("compare-tray")).toBeNull();
      expect(focused()).toBe(screen.getByRole("link", { name: "After" }));
    });

    it("goes there too when the visitor removes them all", () => {
      render(<Page fixture={three()} />);
      act(() => (slot("compare-tray-clear") as HTMLElement).focus());
      click(slot("compare-tray-clear") as HTMLElement);
      expect(slot("compare-tray")).toBeNull();
      expect(focused()).toBe(screen.getByRole("link", { name: "After" }));
    });

    it("walks on from there: removing the next button's product again moves on again", () => {
      render(<Page fixture={states("en").full} />);
      removeWithFocus(0);
      removeWithFocus(0);
      removeWithFocus(0);
      expect(focused()).toBe(removeButtons()[0]);
      expect(removeButtons()).toHaveLength(1);
    });

    it("gives the move up when the page does not remove the product, and does not steal focus later", () => {
      const items = three().items;
      const page = (list: CompareItem[]) => (
        <>
          <button type="button">Before</button>
          {element("en", { ...three(), items: list }, { onRemove: () => {} })}
        </>
      );
      const view = render(page(items));
      removeWithFocus(0);
      // The page kept it. Later it adds a product of its own: focus stays where the visitor had it.
      const first = removeButtons()[0] as HTMLElement;
      expect(focused()).toBe(first);
      const added: CompareItem = { id: "prod_extra", title: "Extra", href: "/us/products/extra" };
      view.rerender(page([...items, added]));
      expect(focused()).toBe(first);
      // And a removal by the page itself, with the visitor elsewhere, does not pull focus in.
      const before = screen.getByRole("button", { name: "Before" });
      act(() => before.focus());
      view.rerender(page(items.slice(1)));
      expect(focused()).toBe(before);
    });
  });

  describe("the height kept clear at the end of the page (WCAG 2.4.11)", () => {
    const root = () => document.documentElement;
    const padding = () => root().style.getPropertyValue("padding-block-end");
    const scrollPadding = () => root().style.getPropertyValue("scroll-padding-block-end");

    function measure(height: number) {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
        this: HTMLElement,
      ) {
        const own = this.getAttribute("data-slot") === "compare-tray" ? height : 0;
        return {
          height: own,
          width: 375,
          top: 0,
          left: 0,
          right: 375,
          bottom: own,
          x: 0,
          y: 0,
        } as DOMRect;
      });
    }

    it("reserves the tray's height on the page while it is shown, and gives it back when it goes", () => {
      measure(132);
      const view = setup("en", states("en").three);
      expect(padding()).toBe("132px");
      expect(scrollPadding()).toBe("132px");
      view.rerender(element("en", { ...states("en").three, items: [] }));
      expect(padding()).toBe("");
      expect(scrollPadding()).toBe("");
    });

    it("keeps it while products come and go, and gives it back when the tray unmounts", () => {
      measure(96);
      render(<Page fixture={states("en").three} />);
      expect(padding()).toBe("96px");
      click(removeButtons()[0] as HTMLElement);
      expect(padding()).toBe("96px");
      click(removeButtons()[0] as HTMLElement);
      expect(padding()).toBe("96px");
      click(removeButtons()[0] as HTMLElement);
      expect(slot("compare-tray")).toBeNull();
      expect(padding()).toBe("");
    });

    it("gives back what the page had before, not nothing", () => {
      root().style.setProperty("padding-block-end", "8px");
      measure(110);
      const view = setup("en", states("en").one);
      expect(padding()).toBe("110px");
      view.unmount();
      expect(padding()).toBe("8px");
    });

    it("uses the same function as the cookie banner, so that a page with both takes the taller", () => {
      expect(source("compare-tray.tsx")).toContain('from "./cookie-consent-reserve"');
      expect(source("cookie-consent.tsx")).toContain('from "./cookie-consent-reserve"');
    });
  });

  describe("prefetch (every story passes false: the pages answer 404 until M3)", () => {
    const prefetchOf = () =>
      screen.getAllByRole("link").map((link) => link.getAttribute("data-prefetch"));

    it("reaches the product links and the compare link", () => {
      setup("en", states("en").three, { prefetch: false });
      expect(prefetchOf()).toHaveLength(4);
      expect(new Set(prefetchOf())).toEqual(new Set(["false"]));
    });

    it("is left to Next when it is not given", () => {
      setup("en", states("en").three, { prefetch: undefined });
      expect(new Set(prefetchOf())).toEqual(new Set(["undefined"]));
    });
  });

  describe.each(["de", "el"] as const)("a long %s title", (locale) => {
    const long = () => commerceFixtures[locale].long.product;
    const fixture = (): Fixture => {
      const three = states(locale).three;
      const title = long().title;
      return {
        ...three,
        items: [{ ...(three.items[0] as CompareItem), title }, ...three.items.slice(1)],
      };
    };

    it("is in full, in the link and in the remove button's name, and nothing cuts it", () => {
      setup(locale, fixture());
      const title = long().title;
      expect(screen.getByRole("link", { name: title })).toBeTruthy();
      expect(removeOf(locale, title)).toBe(removeButtons()[0]);
      const titles = all("compare-tray-title");
      expect(titles[0]?.textContent).toBe(title);
      for (const part of [
        slot("compare-tray"),
        slot("compare-tray-items"),
        slot("compare-tray-actions"),
        slot("compare-tray-status"),
        slot("compare-tray-clear"),
        slot("compare-tray-compare"),
        ...all("compare-tray-item"),
        ...all("compare-tray-link"),
        ...titles,
      ]) {
        expect(part?.className).not.toMatch(CLIPPING_CLASSES);
      }
      for (const part of titles) expect(tokens(part)).toContain("wrap-anywhere");
      for (const part of [slot("compare-tray-clear"), slot("compare-tray-compare")]) {
        expect(tokens(part)).toContain("wrap-anywhere");
      }
    });

    it("lets the cells shrink rather than widen the page", () => {
      setup(locale, fixture());
      for (const part of [
        ...all("compare-tray-item"),
        ...all("compare-tray-link"),
        ...all("compare-tray-title"),
      ]) {
        expect(tokens(part)).toContain("min-w-0");
      }
      expect(tokens(slot("compare-tray-items"))).toContain("min-w-0");
      // Phone: five-rem cells at most, so that four of them fit 375 px; no sideways scroller.
      expect(tokens(slot("compare-tray-items")).join(" ")).toContain(
        "grid-cols-[repeat(4,minmax(0,5rem))]",
      );
      expect(tokens(slot("compare-tray-items")).join(" ")).not.toMatch(/overflow-x|snap-x/);
    });
  });

  describe("the file", () => {
    const text = source("compare-tray.tsx");

    it("keeps the class rules: tokens, logical properties, light only", () => {
      expect(findViolations(text)).toEqual([]);
    });

    it("opens with the T37 header, uses no em dash and cuts nothing", () => {
      expect(text.startsWith('// Ours (T37, SETUP.md "Listing organisms (T37)"')).toBe(true);
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toMatch(CLIPPING_CLASSES);
    });

    it("is a client component that says why, and formats without the catalogs", () => {
      expect(text).toMatch(/^"use client";$/m);
      expect(text.split('"use client"')[0]).toMatch(/A client component, whole/);
      expect(text).toContain('from "@shopblok/i18n/format"');
      expect(text).not.toMatch(/^import (?!type)[^;]*from "@shopblok\/i18n";/m);
    });

    it("moves nothing by itself: no timer, no animation", () => {
      expect(text).not.toMatch(/setInterval|setTimeout|requestAnimationFrame/);
      expect(text).not.toMatch(/\banimate-|\btransition-/);
    });
  });
});
