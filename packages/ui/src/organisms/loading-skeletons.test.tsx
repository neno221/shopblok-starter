// Ours (T36, SETUP.md "Footers and site organisms (T36)"). The tests of LoadingSkeleton: what a
// screen reader hears (one busy region named by the catalog, the name the only string, every shape
// and the box that holds them hidden, no live region), the number of cards, lines and rows, the
// columns of the grid, the shapes checked against the real ProductCard standard's classes, and the
// classes that keep a layout inside a 375 px window. Pixels are not measurable in happy-dom: the
// skeleton card was measured against the real card in headless Chromium (the same height at 375,
// 768 and 1440 px), and the browser checks of the design system are the lead's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { LoadingSkeleton as LoadingSkeletonContent } from "@shopblok/registry/contracts";
import { act, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { ProductCardStandard } from "../molecules/product-card/standard";
import { LoadingSkeleton, type LoadingSkeletonProps } from "./loading-skeletons";

// next/link needs no router here: the real card the skeleton is checked against draws a link.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

type Layout = LoadingSkeletonContent["layout"];

const LAYOUTS: readonly Layout[] = ["product-grid", "product-page", "cart", "account-list"];
const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.loadingSkeleton;
/** The catalog's name for a layout. */
const nameOf = (locale: Locale, layout: Layout) =>
  ({
    "product-grid": copyOf(locale).productGrid,
    "product-page": copyOf(locale).productPage,
    cart: copyOf(locale).cart,
    "account-list": copyOf(locale).accountList,
  })[layout];

function element(layout: Layout, props: Partial<LoadingSkeletonProps> = {}, locale: Locale = "en") {
  return <LoadingSkeleton layout={layout} copy={copyOf(locale)} {...props} />;
}
const setup = (layout: Layout, props?: Partial<LoadingSkeletonProps>, locale?: Locale) =>
  render(element(layout, props, locale));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const all = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const region = () => slot("loading-skeleton") as HTMLElement;
const shapes = () => all("skeleton");

/** Every class token of every element under (and including) the root. */
const classTokens = (root: Element) =>
  [root, ...root.querySelectorAll("*")].flatMap((each) =>
    (each.getAttribute("class") ?? "").split(/\s+/).filter(Boolean),
  );

/**
 * What a screen reader reads, in order: the name of every region it can reach and every text it
 * can reach, skipping what is `aria-hidden` (a whole subtree) or `hidden`. A small model of the
 * accessibility tree, enough to say how many strings the skeleton adds to the page.
 */
function heard(root: Node): string[] {
  const strings: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      if (text !== "") strings.push(text);
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.getAttribute("aria-hidden") === "true" || node.hasAttribute("hidden")) return;
    const name = node.getAttribute("aria-label");
    if (name !== null && name !== "") strings.push(name);
    for (const child of node.childNodes) walk(child);
  };
  walk(root);
  return strings;
}

describe("LoadingSkeleton", () => {
  describe.each(LOCALES)("what a screen reader hears · %s", (locale) => {
    it.each(LAYOUTS)("%s is one busy region named by the catalog", (layout) => {
      setup(layout, undefined, locale);
      const found = screen.getByRole("region", { name: nameOf(locale, layout) });
      expect(found).toBe(region());
      expect(found.getAttribute("aria-busy")).toBe("true");
      expect(found.tagName).toBe("SECTION");
      expect(screen.getAllByRole("region")).toHaveLength(1);
    });

    it.each(LAYOUTS)("%s adds exactly one string to what is read: its name", (layout) => {
      const { container } = setup(layout, undefined, locale);
      expect(heard(container)).toEqual([nameOf(locale, layout)]);
    });

    it("names the four layouts apart, so two skeletons on one page are told apart", () => {
      const names = LAYOUTS.map((layout) => nameOf(locale, layout));
      expect(new Set(names).size).toBe(4);
      for (const name of names) {
        expect(name.trim()).not.toBe("");
        expect(name).not.toContain(String.fromCharCode(0x2014));
      }
    });
  });

  describe.each(LAYOUTS)("%s", (layout) => {
    it("holds no text, so the name is all that is read", () => {
      setup(layout);
      expect(region().textContent).toBe("");
      expect(within(region()).queryAllByText(/./)).toEqual([]);
    });

    it("hides every shape from assistive technology, and the box that holds them", () => {
      setup(layout);
      expect(shapes().length).toBeGreaterThan(0);
      for (const shape of shapes()) expect(shape.getAttribute("aria-hidden")).toBe("true");
      // The box is hidden whole, so no empty group or list is exposed under the region.
      const box = region().firstElementChild as HTMLElement;
      expect(region().children).toHaveLength(1);
      expect(box.getAttribute("aria-hidden")).toBe("true");
      for (const each of region().querySelectorAll("*")) {
        expect(each.closest('[aria-hidden="true"]'), each.outerHTML.slice(0, 80)).not.toBeNull();
      }
    });

    it("announces nothing: no live region, no status, no progressbar, no alert, no list", () => {
      setup(layout);
      expect(
        region().querySelectorAll(
          '[aria-live], [role="status"], [role="alert"], [role="progressbar"], [role="log"], [role="list"], [role="group"], ul, ol, a, button, input, [tabindex]',
        ),
      ).toHaveLength(0);
      expect(region().hasAttribute("aria-live")).toBe(false);
      expect(region().getAttribute("role")).toBeNull();
      expect(screen.queryAllByRole("status")).toEqual([]);
      expect(screen.queryAllByRole("progressbar")).toEqual([]);
      expect(screen.queryAllByRole("alert")).toEqual([]);
      // Nothing to reach with a key: a skeleton is not part of the tab order.
      expect(region().querySelectorAll("[tabindex]")).toHaveLength(0);
    });

    it("is a server component's markup: the same on the server and in the browser", () => {
      const server = renderToString(element(layout));
      expect(server).toContain('aria-busy="true"');
      expect(server).toContain(`data-layout="${layout}"`);
      expect(renderToString(element(layout))).toBe(server);
    });

    it("hydrates the server's markup with no mismatch", async () => {
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element(layout));
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      let root!: ReturnType<typeof hydrateRoot>;
      await act(async () => {
        root = hydrateRoot(container, element(layout), { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      error.mockRestore();
      await act(async () => root.unmount());
      container.remove();
    });

    it("keeps the class it is given on the region, and the region can shrink", () => {
      setup(layout, { className: "mt-8" });
      expect(region().className).toContain("mt-8");
      expect(region().className).toContain("min-w-0");
      expect(region().className).toContain("w-full");
      expect(region().getAttribute("data-layout")).toBe(layout);
    });

    it("cuts nothing and fixes no width a 375 px window could not hold", () => {
      setup(layout);
      const tokens = classTokens(region());
      for (const token of tokens) {
        expect(token, token).not.toMatch(CLIPPING_CLASSES);
        // Sizes are the spacing token's scale, fractions and the cards' ratio: no pixel or rem
        // literal for a width or a height, except the cart's thumbnail column and summary column.
        expect(token, token).not.toMatch(/(?:^|:)(?:min-|max-)?(?:w|h|size)-\[/);
        expect(token, token).not.toMatch(/(?:^|:)(?:w|min-w)-(?:screen|max|min|fit)$/);
        // The fixed widths are small ones (at most 8rem), so a row of them wraps or shrinks.
        const fixed = /^w-(\d+)$/.exec(token);
        if (fixed !== null) expect(Number(fixed[1]), token).toBeLessThanOrEqual(32);
      }
    });

    it("has no horizontal scroll of its own", () => {
      setup(layout);
      for (const token of classTokens(region())) {
        expect(token, token).not.toMatch(/^overflow-x-(?:auto|scroll)$/);
        expect(token, token).not.toMatch(/^(?:snap|scroll)-/);
      }
    });

    it("lets every box that holds others shrink below its content, so nothing is wider than the window", () => {
      setup(layout);
      const has = (each: Element, token: string) => each.className.split(/\s+/).includes(token);
      for (const holder of region().querySelectorAll<HTMLElement>("div")) {
        const parent = holder.parentElement;
        if (parent === null || parent === region() || holder.children.length === 0) continue;
        // The boxes whose size the browser works out from the content: a grid's items and a row's.
        const gridItem = has(parent, "grid");
        const rowItem = has(parent, "flex") && !has(parent, "flex-col");
        if (gridItem || rowItem) expect(has(holder, "min-w-0"), holder.className).toBe(true);
      }
    });
  });

  describe("product-grid", () => {
    it("draws 8 cards unless it is given a number", () => {
      setup("product-grid");
      expect(all("loading-skeleton-card")).toHaveLength(8);
    });

    it.each([1, 3, 12, 24])("draws %i cards when it is given that number", (items) => {
      setup("product-grid", { items });
      expect(all("loading-skeleton-card")).toHaveLength(items);
    });

    it("lays the cards out in two columns, three from md and four from lg", () => {
      setup("product-grid");
      const grid = slot("loading-skeleton-card")?.parentElement as HTMLElement;
      const classes = grid.className.split(/\s+/);
      expect(classes).toContain("grid");
      expect(classes).toContain("grid-cols-2");
      expect(classes).toContain("md:grid-cols-3");
      expect(classes).toContain("lg:grid-cols-4");
      // The cards' gaps are the listing's: one set of gaps under md, a wider one from md.
      expect(classes).toEqual(
        expect.arrayContaining(["gap-x-4", "gap-y-6", "md:gap-x-6", "md:gap-y-8"]),
      );
    });

    it("shapes each card like ProductCard standard, so the page does not move when the cards arrive", () => {
      // The real card, drawn from the fixtures, and the skeleton's, measured by their classes.
      const product = commerceFixtures.en.products[0];
      if (product === undefined) throw new Error("no product");
      const real = render(
        <ProductCardStandard
          product={product}
          copy={{
            card: catalogs.en.molecules.productCard,
            priceBlock: catalogs.en.molecules.priceBlock,
          }}
          locale="en-US"
          sizes="50vw"
          prefetch={false}
        />,
      ).container;
      const card = slot("product-card", real) as HTMLElement;
      const media = slot("product-card-media", real) as HTMLElement;
      const link = real.querySelector<HTMLElement>("[data-slot='product-card-title'] a");
      const price = slot("price", real) as HTMLElement;
      real.remove();

      const view = setup("product-grid", { items: 1 });
      const skeleton = slot("loading-skeleton-card", view.container) as HTMLElement;

      // 1. The card: a column with a 0.75rem gap, as the real one.
      for (const token of ["flex", "flex-col", "gap-3"]) {
        expect(card.className.split(/\s+/), `real card ${token}`).toContain(token);
        expect(skeleton.className.split(/\s+/), `skeleton ${token}`).toContain(token);
      }
      // 2. The picture: the real card's frame is 3:4, full width; so is the skeleton's.
      const frame = media.querySelector<HTMLElement>("[class*='aspect-']") as HTMLElement;
      const ratio = frame.className.split(/\s+/).find((token) => token.startsWith("aspect-"));
      expect(ratio).toBe("aspect-[3/4]");
      const picture = skeleton.firstElementChild as HTMLElement;
      expect(picture.getAttribute("data-slot")).toBe("skeleton");
      expect(picture.className.split(/\s+/)).toContain(ratio);
      expect(picture.className.split(/\s+/)).toContain("w-full");
      // 3. The text below it: a column with a 0.375rem gap, as the real one.
      const text = skeleton.lastElementChild as HTMLElement;
      expect(text.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["flex", "min-w-0", "flex-col", "gap-1.5"]),
      );
      expect(link?.parentElement?.parentElement?.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["flex", "min-w-0", "flex-col", "gap-1.5"]),
      );
      // 4. The title: the real link is at least 44 px high (`min-h-11`), and the skeleton's box is
      //    that height, with two lines of text in it.
      expect(link?.className.split(/\s+/)).toContain("min-h-11");
      const title = text.firstElementChild as HTMLElement;
      expect(title.className.split(/\s+/)).toContain("h-11");
      expect(all("skeleton", title)).toHaveLength(2);
      // 5. The price: a `text-base` line (24 px), and the skeleton's box is `h-6`.
      expect(price.className.split(/\s+/)).toContain("text-base");
      const priceBox = text.lastElementChild as HTMLElement;
      expect(priceBox.className.split(/\s+/)).toContain("h-6");
    });
  });

  describe("product-page", () => {
    it("draws the gallery and the buy box side by side from md, stacked under it", () => {
      setup("product-page");
      const columns = region().querySelector<HTMLElement>("[class*='md:grid-cols-2']");
      expect(columns).not.toBeNull();
      expect(columns?.className.split(/\s+/)).toContain("grid");
      expect(columns?.children).toHaveLength(2);
    });

    it("draws a picture, four thumbnails, the title, the price, five options and the button", () => {
      setup("product-page");
      const gallery = region().querySelector<HTMLElement>("[class*='md:grid-cols-2']")
        ?.firstElementChild as HTMLElement;
      // The picture, then a row of four thumbnails.
      expect(gallery.firstElementChild?.className).toContain("aspect-[4/5]");
      expect(gallery.lastElementChild?.children).toHaveLength(4);
      const buy = region().querySelector<HTMLElement>("[class*='md:grid-cols-2']")
        ?.lastElementChild as HTMLElement;
      // Two lines of title, the price, the option's label and five pills, the button, two notes.
      expect(buy.querySelectorAll(".rounded-full")).toHaveLength(5);
      expect(buy.querySelectorAll(".h-12.w-full")).toHaveLength(1);
      // The pills are touch targets' size (44 px).
      for (const pill of buy.querySelectorAll(".rounded-full")) {
        expect(pill.className.split(/\s+/)).toContain("h-11");
      }
    });

    it("ignores `items`: the page has no repeated part", () => {
      const plain = renderToString(element("product-page"));
      expect(renderToString(element("product-page", { items: 7 }))).toBe(plain);
      expect(renderToString(element("product-page", { items: 24 }))).toBe(plain);
    });
  });

  describe("cart", () => {
    it("draws 3 lines unless it is given a number, and one summary", () => {
      setup("cart");
      expect(all("loading-skeleton-line")).toHaveLength(3);
      expect(all("loading-skeleton-summary")).toHaveLength(1);
    });

    it.each([1, 2, 6, 24])(
      "draws %i lines when it is given that number, and still one summary",
      (items) => {
        setup("cart", { items });
        expect(all("loading-skeleton-line")).toHaveLength(items);
        expect(all("loading-skeleton-summary")).toHaveLength(1);
      },
    );

    it("puts the summary under the lines, and beside them from lg", () => {
      setup("cart");
      const columns = slot("loading-skeleton-line")?.parentElement?.parentElement as HTMLElement;
      expect(columns.className.split(/\s+/)).toContain("grid");
      expect(columns.className).toContain("lg:grid-cols-[minmax(0,1fr)_22rem]");
      expect(columns.children).toHaveLength(2);
      expect(columns.lastElementChild).toBe(slot("loading-skeleton-summary"));
    });

    it("shapes a line like CartLineItem's: a 5rem thumbnail, then the title, the stepper and the price", () => {
      setup("cart", { items: 1 });
      const line = slot("loading-skeleton-line") as HTMLElement;
      expect(line.className).toContain("grid-cols-[5rem_minmax(0,1fr)]");
      // The stepper is a touch target's height.
      expect(line.querySelector(".h-11.w-32")).not.toBeNull();
      // Lines are told apart by a rule, the first has none above it.
      expect(line.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["border-t", "border-border", "first:border-t-0"]),
      );
    });
  });

  describe("account-list", () => {
    it("draws 4 rows unless it is given a number", () => {
      setup("account-list");
      expect(all("loading-skeleton-row")).toHaveLength(4);
    });

    it.each([1, 2, 9, 24])("draws %i rows when it is given that number", (items) => {
      setup("account-list", { items });
      expect(all("loading-skeleton-row")).toHaveLength(items);
    });

    it("keeps the status on the end of each row and lets the text beside it shrink", () => {
      setup("account-list", { items: 1 });
      const row = slot("loading-skeleton-row") as HTMLElement;
      const [text, status] = [...row.children] as HTMLElement[];
      expect(text?.className.split(/\s+/)).toEqual(expect.arrayContaining(["min-w-0", "flex-1"]));
      expect(status?.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["shrink-0", "rounded-full"]),
      );
    });
  });

  describe("only the layouts that repeat", () => {
    it("draws no card in the cart and no line in the grid", () => {
      setup("cart");
      expect(all("loading-skeleton-card")).toHaveLength(0);
      expect(all("loading-skeleton-row")).toHaveLength(0);
    });

    it("draws nothing but its own layout's parts", () => {
      const parts = [
        "loading-skeleton-card",
        "loading-skeleton-line",
        "loading-skeleton-summary",
        "loading-skeleton-row",
      ];
      const own: Record<Layout, string[]> = {
        "product-grid": ["loading-skeleton-card"],
        "product-page": [],
        cart: ["loading-skeleton-line", "loading-skeleton-summary"],
        "account-list": ["loading-skeleton-row"],
      };
      for (const layout of LAYOUTS) {
        const { container, unmount } = setup(layout);
        for (const part of parts) {
          expect(all(part, container).length > 0, `${layout}: ${part}`).toBe(
            own[layout].includes(part),
          );
        }
        unmount();
      }
    });
  });

  describe("motion", () => {
    it("pulses only for readers who have not asked for reduced motion, and draws no other motion", () => {
      for (const layout of LAYOUTS) {
        const { unmount } = setup(layout);
        for (const shape of shapes()) {
          expect(shape.className).toContain("motion-safe:animate-pulse");
          expect(shape.className.split(/\s+/)).not.toContain("animate-pulse");
        }
        for (const token of classTokens(region())) {
          if (/animate-|transition|duration-/.test(token)) {
            expect(token, `${layout}: ${token}`).toBe("motion-safe:animate-pulse");
          }
        }
        unmount();
      }
    });
  });

  describe("shapes keep to the tokens", () => {
    it("uses no colour but the muted token's (through the Skeleton atom) and the border token", () => {
      for (const layout of LAYOUTS) {
        const { unmount } = setup(layout);
        for (const token of classTokens(region())) {
          const utility = token.replace(/^(?:[a-z-]+:)+/, "");
          if (/^(?:bg|text|border|ring|fill|stroke)-/.test(utility) || utility === "border") {
            expect(utility, `${layout}: ${token}`).toMatch(
              /^(?:bg-muted|border-border|border-t|border-t-0|border)$/,
            );
          }
        }
        unmount();
      }
    });
  });
});

describe("the file", () => {
  const source = readFileSync(path.join(import.meta.dirname, "loading-skeletons.tsx"), "utf8");
  const EM_DASH = String.fromCharCode(0x2014);

  it("is a server component: no 'use client', no hook, no event handler", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(source).not.toMatch(
      /\buse(?:State|Effect|Ref|Id|Memo|Callback|Reducer|SyncExternalStore)\b/,
    );
    expect(source).not.toMatch(/\bon[A-Z][A-Za-z]*=/);
  });

  it("is built from the Skeleton atom and sets no `animate` class of its own", () => {
    expect(source).toMatch(/from "@shopblok\/ui\/atoms\/skeleton"/);
    expect(source).not.toMatch(/animate-/);
    expect(source).not.toMatch(/aria-live|role=/);
  });

  it("imports the registry's and i18n's types only, so no schema or catalog reaches a bundle (D41)", () => {
    const imports = [...source.matchAll(/^import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gms)];
    const shared = imports.filter((each) => /@shopblok\/(?:registry|i18n)/.test(each[2] ?? ""));
    expect(shared.length).toBeGreaterThan(0);
    for (const each of shared) expect(each[1], each[2]).toBeDefined();
  });

  it("uses no em dash, and keeps the class rules (logical properties, token colours, no dark)", () => {
    expect(source).not.toContain(EM_DASH);
    expect(findViolations(source)).toEqual([]);
  });

  it("is named for each of the contract's layouts", () => {
    for (const layout of LAYOUTS) expect(source).toContain(`"${layout}"`);
  });

  it("has the catalog's four names in every locale", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(copyOf(locale)).sort()).toEqual([
        "accountList",
        "cart",
        "productGrid",
        "productPage",
      ]);
      expect(htmlLang[locale]).toBeTruthy();
    }
  });
});
