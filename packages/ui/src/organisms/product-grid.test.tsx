// Ours (T37, SETUP.md "Listing organisms (T37)"). The tests of ProductGrid, ListingCard and the
// layout module they share with the loading skeleton, in happy-dom with Testing Library: the list
// and its name in the four locales, the ten variants (and the quick-add form's action and status),
// the columns (the skeleton's, from one module), the `sizes` of each layout, the list layout's
// horizontal card whatever the variant, the empty state and its heading level, the prefetch every
// link takes, a long German and Greek title, and the files' classes and imports. Pixels are not
// measurable here: the columns and the empty state were drawn in headless Chromium, and the browser
// checks of the design system are the lead's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { ProductCard, ProductCardVariant } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { LoadingSkeleton } from "./loading-skeletons";
import { ListingCard } from "./listing-card";
import { ProductGrid, type ProductGridProps } from "./product-grid";
import { PRODUCT_GRID, PRODUCT_GRID_SIZES } from "./product-grid-layout";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const VARIANTS: readonly ProductCardVariant[] = [
  "standard",
  "swatches",
  "quick-add",
  "overlay",
  "minimal",
  "horizontal",
  "compact",
  "editorial",
  "bordered",
  "image-swap",
];
const EM_DASH = String.fromCharCode(0x2014);

const copyOf = (locale: Locale): ProductGridProps["copy"] => ({
  grid: catalogs[locale].organisms.productGrid,
  card: catalogs[locale].molecules.productCard,
  priceBlock: catalogs[locale].molecules.priceBlock,
});
const fixtures = (locale: Locale) => commerceFixtures[locale].listing.grid;

function element(locale: Locale = "en", props: Partial<ProductGridProps> = {}) {
  return (
    <ProductGrid
      {...fixtures(locale).products}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}
const setup = (locale: Locale = "en", props?: Partial<ProductGridProps>) =>
  render(element(locale, props));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const all = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const tokens = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");

/** The products with a path for a picture: next/image drops `sizes` for a data URI. */
const withPaths = (products: ProductCard[]) =>
  products.map((product) => ({
    ...product,
    images: product.images.map((image, index) => ({
      ...image,
      src: `/media/${product.handle}-${index}.png`,
    })),
  }));

describe("ProductGrid", () => {
  describe.each(LOCALES)("the list · %s", (locale) => {
    it("is a list named by the catalog, with one item and one card to a product", () => {
      setup(locale);
      const list = screen.getByRole("list", { name: catalogs[locale].organisms.productGrid.label });
      expect(list).toBe(slot("product-grid"));
      const products = fixtures(locale).products.products;
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(products.length);
      for (const [index, item] of items.entries()) {
        const cards = item.querySelectorAll("article[data-slot=product-card]");
        expect(cards).toHaveLength(1);
        expect(
          within(item).getByRole("link", { name: products[index]?.title }).getAttribute("href"),
        ).toBe(products[index]?.href);
      }
    });

    it("draws each card's title as an h3, and takes another heading element", () => {
      const view = setup(locale);
      const count = fixtures(locale).products.products.length;
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(count);
      view.unmount();
      setup(locale, { heading: "h2" });
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(count);
      expect(screen.queryAllByRole("heading", { level: 3 })).toEqual([]);
    });

    it("has no other link than the cards' and no button but the cards' own", () => {
      setup(locale);
      expect(screen.getAllByRole("link")).toHaveLength(fixtures(locale).products.products.length);
      expect(screen.queryAllByRole("button")).toEqual([]);
    });
  });

  describe("the columns", () => {
    it("are the loading skeleton's, two under md, three from md and four from lg", () => {
      setup();
      const grid = slot("product-grid") as HTMLElement;
      for (const token of PRODUCT_GRID.split(" ")) expect(tokens(grid), token).toContain(token);
      expect(tokens(grid)).toEqual(
        expect.arrayContaining([
          "grid-cols-2",
          "md:grid-cols-3",
          "lg:grid-cols-4",
          "gap-x-4",
          "gap-y-6",
          "md:gap-x-6",
          "md:gap-y-8",
        ]),
      );
      expect(grid.getAttribute("data-layout")).toBe("grid");
    });

    it("are the same classes as the skeleton's grid, read from one module", () => {
      const skeleton = render(
        <LoadingSkeleton layout="product-grid" copy={catalogs.en.organisms.loadingSkeleton} />,
      ).container;
      const skeletonGrid = slot("loading-skeleton-card", skeleton)?.parentElement ?? null;
      setup();
      const grid = slot("product-grid") as HTMLElement;
      for (const token of PRODUCT_GRID.split(" ")) {
        expect(tokens(skeletonGrid), token).toContain(token);
        expect(tokens(grid), token).toContain(token);
      }
      // Neither writes the columns of its own: both take them from the module.
      expect(source("loading-skeletons.tsx")).toContain('from "./product-grid-layout"');
      expect(source("product-grid.tsx")).toContain('from "./product-grid-layout"');
      expect(source("loading-skeletons.tsx")).not.toContain("lg:grid-cols-4");
      expect(source("product-grid.tsx")).not.toContain("lg:grid-cols-4");
    });

    it("let a cell shrink (min-w-0), so a long title cannot widen the page", () => {
      setup();
      expect(tokens(slot("product-grid"))).toContain("min-w-0");
      for (const item of all("product-grid-item")) expect(tokens(item)).toContain("min-w-0");
    });
  });

  describe("the pictures' sizes", () => {
    // The cards' pictures, not the stars (the Rating atom is a role="img" too).
    const sizesOf = () =>
      [...document.querySelectorAll("img")].map((img) => img.getAttribute("sizes") ?? "(none)");

    it("follow the columns in a grid: a half, a third from md, a quarter from lg", () => {
      expect(PRODUCT_GRID_SIZES).toBe("(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw");
      setup("en", { products: withPaths(fixtures("en").products.products) });
      const sizes = sizesOf();
      expect(sizes.length).toBeGreaterThan(0);
      expect(new Set(sizes)).toEqual(new Set([PRODUCT_GRID_SIZES]));
    });

    it("are the horizontal card's 96 px in a list", () => {
      setup("en", {
        layout: "list",
        products: withPaths(fixtures("en").products.products.slice(0, 4)),
      });
      expect(new Set(sizesOf())).toEqual(new Set(["96px"]));
    });
  });

  describe.each(VARIANTS)("the %s variant", (variant) => {
    it("draws every product as that card", () => {
      setup("en", { variant });
      const cards = all("product-card");
      expect(cards).toHaveLength(fixtures("en").products.products.length);
      for (const card of cards) expect(card.getAttribute("data-variant")).toBe(variant);
      // Only quick add has a form (a button for each product).
      expect(all("product-card-quick-add").length > 0).toBe(variant === "quick-add");
    });

    it("keeps one link to the product in each card", () => {
      setup("en", { variant });
      for (const card of all("product-card")) {
        expect(within(card).getAllByRole("link")).toHaveLength(1);
      }
    });
  });

  describe("quick add", () => {
    const products = () => fixtures("en").products.products.slice(0, 3);

    it("goes to the product's own page when the grid was given no action", () => {
      setup("en", { variant: "quick-add", products: products() });
      const forms = all("product-card-quick-add");
      expect(forms).toHaveLength(3);
      for (const [index, form] of forms.entries()) {
        expect(form.getAttribute("action")).toBe(products()[index]?.href);
      }
    });

    it("gives every card the action it was given", () => {
      setup("en", {
        variant: "quick-add",
        products: products(),
        quickAdd: { action: "/cart/add" },
      });
      for (const form of all("product-card-quick-add")) {
        expect(form.getAttribute("action")).toBe("/cart/add");
        expect(form.getAttribute("data-status")).toBe("idle");
      }
    });

    it("gives each card the status of its own product, by id", () => {
      const [first, second, third] = products();
      setup("en", {
        variant: "quick-add",
        products: products(),
        quickAdd: {
          action: "/cart/add",
          status: { [second!.id]: "adding", [third!.id]: "error" },
        },
      });
      const status = (id: string) =>
        all("product-card-quick-add").find(
          (form) => form.querySelector<HTMLInputElement>("input[name=productId]")?.value === id,
        )?.dataset.status;
      expect(status(first!.id)).toBe("idle");
      expect(status(second!.id)).toBe("adding");
      expect(status(third!.id)).toBe("error");
    });

    it("is not given to the other variants, which draw no form", () => {
      setup("en", { variant: "standard", quickAdd: { action: "/cart/add" } });
      expect(all("product-card-quick-add")).toEqual([]);
    });

    it("is what ListingCard draws for the variant, with the props of the card", () => {
      const product = products()[0]!;
      render(
        <ListingCard
          variant="quick-add"
          quickAdd={{ action: "/cart/add", status: { [product.id]: "added" } }}
          product={product}
          copy={copyOf("en")}
          locale="en-US"
          sizes="50vw"
          prefetch={false}
        />,
      );
      expect(slot("product-card")?.getAttribute("data-variant")).toBe("quick-add");
      expect(slot("product-card-quick-add")?.getAttribute("data-status")).toBe("added");
    });
  });

  describe("the list layout", () => {
    it.each(["standard", "overlay", "editorial", "quick-add"] as const)(
      "draws the horizontal card whatever the variant is (%s)",
      (variant) => {
        setup("en", { layout: "list", variant });
        const cards = all("product-card");
        expect(cards).toHaveLength(fixtures("en").products.products.length);
        for (const card of cards) expect(card.getAttribute("data-variant")).toBe("horizontal");
        expect(all("product-card-quick-add")).toEqual([]);
      },
    );

    it("is one column at every width: no grid classes, a rule between the rows", () => {
      setup("en", { layout: "list" });
      const list = slot("product-grid") as HTMLElement;
      expect(list.getAttribute("data-layout")).toBe("list");
      expect(tokens(list)).toEqual(expect.arrayContaining(["flex", "flex-col"]));
      expect(tokens(list).filter((token) => token.includes("grid"))).toEqual([]);
      const items = all("product-grid-item");
      for (const item of items) {
        expect(tokens(item)).toEqual(expect.arrayContaining(["border-b", "border-border", "py-4"]));
      }
      // No rule above the first or below the last, and no padding there either.
      expect(tokens(items[0] ?? null)).toContain("first:pt-0");
      expect(tokens(items.at(-1) ?? null)).toEqual(
        expect.arrayContaining(["last:border-b-0", "last:pb-0"]),
      );
    });

    it("is still a list named by the catalog, with its heading level", () => {
      setup("de", { layout: "list", heading: "h2" });
      expect(
        screen.getByRole("list", { name: catalogs.de.organisms.productGrid.label }),
      ).toBeTruthy();
      expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(0);
    });
  });

  describe.each(LOCALES)("with no products · %s", (locale) => {
    const emptyProps = () => fixtures(locale).empty;

    it("draws the empty state and no list", () => {
      setup(locale, emptyProps());
      expect(screen.queryByRole("list")).toBeNull();
      expect(screen.queryAllByRole("article")).toEqual([]);
      const { empty } = emptyProps();
      expect(screen.getByRole("heading", { level: 2, name: empty.title })).toBeTruthy();
      expect(screen.getByText(empty.text!)).toBeTruthy();
      const action = screen.getByRole("link", { name: empty.action!.label });
      expect(action.getAttribute("href")).toBe(empty.action!.href);
      expect(slot("product-grid")?.getAttribute("data-state")).toBe("empty");
    });

    it("takes the title's heading level from the prop", () => {
      setup(locale, { ...emptyProps(), emptyHeading: 4 });
      expect(
        screen.getByRole("heading", { level: 4, name: emptyProps().empty.title }),
      ).toBeTruthy();
      expect(screen.queryAllByRole("heading", { level: 2 })).toEqual([]);
    });
  });

  describe("with no products", () => {
    it("draws the icon as decoration, a default one or the page's", () => {
      setup("en", fixtures("en").empty);
      const icon = slot("empty-state-icon");
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
      expect(icon?.querySelector("svg")).not.toBeNull();
    });

    it("draws no list for an empty list layout either, and leaves the way out out when there is none", () => {
      const { empty } = fixtures("en").empty;
      setup("en", { products: [], layout: "list", empty: { title: empty.title } });
      expect(screen.queryByRole("list")).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByRole("heading", { name: empty.title })).toBeTruthy();
    });
  });

  describe("prefetch (every story passes false: the pages answer 404 until M3)", () => {
    const prefetchOf = () =>
      screen.getAllByRole("link").map((link) => link.getAttribute("data-prefetch"));

    it("reaches every link of the cards", () => {
      setup("en", { prefetch: false });
      expect(new Set(prefetchOf())).toEqual(new Set(["false"]));
    });

    it("reaches the list layout's cards and the empty state's action", () => {
      const view = setup("en", { layout: "list", prefetch: false });
      expect(new Set(prefetchOf())).toEqual(new Set(["false"]));
      view.unmount();
      setup("en", { ...fixtures("en").empty, prefetch: false });
      expect(prefetchOf()).toEqual(["false"]);
    });

    it("is left to Next when it is not given", () => {
      setup("en", { prefetch: undefined });
      expect(new Set(prefetchOf())).toEqual(new Set(["undefined"]));
    });
  });

  describe.each(["de", "el"] as const)("a long %s title", (locale) => {
    it("is the link's name in full, and nothing around the card cuts it", () => {
      const long = commerceFixtures[locale].long.product;
      const { container } = setup(locale, {
        products: [long, ...fixtures(locale).products.products],
      });
      expect(screen.getByRole("link", { name: long.title })).toBeTruthy();
      // The card's own title clamp is the one place that cuts (T32); the grid and its rows do not.
      for (const part of [slot("product-grid"), ...all("product-grid-item")]) {
        expect(part?.className).not.toMatch(CLIPPING_CLASSES);
      }
      expect(container.querySelectorAll("[data-truncate]").length).toBeGreaterThan(0);
    });

    it("wraps in the list layout too", () => {
      const long = commerceFixtures[locale].long.product;
      setup(locale, { layout: "list", products: [long] });
      expect(screen.getByRole("link", { name: long.title })).toBeTruthy();
      expect(slot("product-grid")?.className).not.toMatch(CLIPPING_CLASSES);
    });
  });

  describe("the files", () => {
    const files = ["product-grid.tsx", "product-grid-layout.ts", "listing-card.tsx"];

    it.each(files)("%s keeps the class rules: tokens, logical properties, light only", (file) => {
      expect(findViolations(source(file))).toEqual([]);
    });

    it.each(files)("%s opens with the T37 header, uses no em dash and cuts nothing", (file) => {
      const text = source(file);
      expect(text.startsWith('// Ours (T37, SETUP.md "Listing organisms (T37)"')).toBe(true);
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toMatch(CLIPPING_CLASSES);
    });

    it("keeps the grid a server component: no client directive, no state", () => {
      for (const file of ["product-grid.tsx", "listing-card.tsx"]) {
        expect(source(file)).not.toMatch(/^"use client";?$/m);
        expect(source(file)).not.toMatch(/\buse(?:State|Effect|Ref|Reducer)\b/);
      }
    });
  });
});
