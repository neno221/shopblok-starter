// Ours (T81, SETUP.md "Catalog block variants (T81)"; M5 plan §1a, D99, D100, D102). The sixteen
// members of the catalog blocks, in Testing Library and happy-dom: each draws its section with its
// `data-variant` and its heading, and what each adds over the first member (the circles' named row
// that scrolls, the carousel's slides, the ranked list's numbers in the links' names, the tabs'
// links without scripts, the banner's and the look's pictures, the
// gallery's pictures, the bundle's sum, the stacked spotlight).
import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { ProductCard } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BundleSection } from "./bundle";
import { bundleTotal } from "./bundle/list";
import { CategoryShowcaseSection } from "./category-showcase";
import { CollectionSpotlightSection } from "./collection-spotlight";
import { FeaturedProductSection } from "./featured-product";
import { ProductCollectionSection } from "./product-collection";
import { sectionsCopy } from "./section-copy";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const f = sectionFixtures.en;
const copy = sectionsCopy(catalogs.en);
const locale = "en-US";
const root = (container: HTMLElement, family: string) =>
  container.querySelector(`[data-slot=${family}-section]`) as HTMLElement;

describe("the category showcase's members (T81)", () => {
  it.each(["circles", "bento", "carousel", "list", "banner"] as const)(
    "%s: says so, with the heading and a link per category",
    (variant) => {
      const section = f.categoryShowcase.section;
      const { container } = render(
        <CategoryShowcaseSection {...section} variant={variant} copy={copy} locale={locale} />,
      );
      expect(root(container, "category-showcase").getAttribute("data-variant")).toBe(variant);
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
      const shown = variant === "bento" ? section.tiles.slice(0, 5) : section.tiles;
      for (const tile of shown)
        expect(
          container.querySelector(`[data-slot=category-tile][href="${tile.href}"]`)?.textContent,
        ).toContain(tile.label);
    },
  );

  it("bento: one large tile and up to four more, the rest left out", () => {
    const { container } = render(
      <CategoryShowcaseSection
        {...f.categoryShowcase.section}
        variant="bento"
        copy={copy}
        locale={locale}
      />,
    );
    expect(container.querySelectorAll("[data-slot=category-tile]")).toHaveLength(5);
  });

  it("circles: the row that scrolls is a named list the keyboard can reach", () => {
    const { container } = render(
      <CategoryShowcaseSection
        {...f.categoryShowcase.edited}
        heading={undefined}
        variant="circles"
        copy={copy}
        locale={locale}
      />,
    );
    const row = container.querySelector("[data-slot=category-circles]") as HTMLElement;
    expect(row.getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("list", { name: catalogs.en.sections.categoryShowcase.label })).toBe(
      row,
    );
  });

  it("carousel: a region named by the heading, each tile a slide named by its place", () => {
    const section = f.categoryShowcase.section;
    render(<CategoryShowcaseSection {...section} variant="carousel" copy={copy} locale={locale} />);
    const region = screen.getByRole("region", { name: section.heading });
    expect(within(region).getAllByRole("group")[0]?.getAttribute("aria-label")).toBe(
      `1 of ${section.tiles.length}`,
    );
    expect(
      within(region).getByRole("button", { name: catalogs.en.sections.categoryShowcase.next }),
    ).toBeTruthy();
  });
});

describe("the product collection's members (T81)", () => {
  it.each([
    ["featured-first", f.productCollection.carousel],
    ["editorial", f.productCollection.carousel],
    ["tabs", f.productCollection.tabs],
    ["ranked", f.productCollection.ranked],
    ["with-banner", f.productCollection.banner],
    ["compact", f.productCollection.carousel],
    ["lookbook", f.productCollection.look],
  ] as const)("%s: says so, with the heading and its products' links", (variant, section) => {
    const { container } = render(
      <ProductCollectionSection {...section} variant={variant} copy={copy} locale={locale} />,
    );
    expect(root(container, "product-collection").getAttribute("data-variant")).toBe(variant);
    expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
    const shown = variant === "lookbook" ? section.products.slice(0, 4) : section.products;
    for (const product of shown)
      expect(container.querySelector(`a[href="${product.href}"]`)).not.toBeNull();
  });

  it.each(["featured-first", "editorial", "ranked", "compact"] as const)(
    "%s: with no product, the empty state the editor asked for",
    (variant) => {
      const { container } = render(
        <ProductCollectionSection
          {...f.productCollection.empty}
          variant={variant}
          copy={copy}
          locale={locale}
        />,
      );
      expect(root(container, "product-collection").getAttribute("data-variant")).toBe(variant);
      expect(container.querySelector("[data-slot=empty-state]")).not.toBeNull();
    },
  );

  it("ranked: an ordered list whose links say each product's number first", () => {
    const section = f.productCollection.ranked;
    render(<ProductCollectionSection {...section} copy={copy} locale={locale} />);
    const list = screen.getByRole("list", { name: catalogs.en.organisms.productGrid.label });
    expect(list.tagName).toBe("OL");
    section.products.forEach((product, index) => {
      expect(
        within(list).getByRole("link", { name: `Number ${index + 1}: ${product.title}` }),
      ).toBeTruthy();
    });
  });

  it.each([
    ["with-banner", f.productCollection.banner],
    ["lookbook", f.productCollection.look],
  ] as const)("%s: draws the editor's picture", (variant, section) => {
    render(<ProductCollectionSection {...section} variant={variant} copy={copy} locale={locale} />);
    expect(screen.getByRole("img", { name: section.image?.alt })).toBeTruthy();
  });

  it("tabs: without scripts, the tabs' links over the first tab's products, and none of the others'", () => {
    const section = f.productCollection.tabs;
    const markup = renderToStaticMarkup(
      <ProductCollectionSection {...section} copy={copy} locale={locale} prefetch={false} />,
    );
    const host = document.createElement("div");
    host.innerHTML = markup;
    // The tabs are the browser's: the server's HTML has none of them.
    expect(host.querySelector("[data-slot=product-collection-tabs]")).toBeNull();
    const links = [...host.querySelectorAll("[data-slot=product-collection-tab-link]")];
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual(
      (section.tabs ?? []).map((tab) => [tab.label, tab.href]),
    );
    expect(links.map((a) => a.getAttribute("aria-current"))).toEqual(["true", null, null]);
    const heading = host.querySelector("[data-slot=section-heading]") as HTMLElement;
    expect(links[0]?.closest("ul")?.getAttribute("aria-labelledby")).toBe(heading.id);
    const shown = [...host.querySelectorAll("[data-slot=product-card]")].length;
    expect(shown).toBe(section.products.length);
    // Another tab's products are not in the HTML.
    const others = (section.tabs?.[2]?.products ?? []).filter(
      (product) => !section.products.some((first) => first.id === product.id),
    );
    expect(others.length).toBeGreaterThan(0);
    for (const product of others) expect(markup).not.toContain(product.href);
  });

  it("tabs: with one tab left, the heading over its products and no tab at all", () => {
    const section = f.productCollection.tabs;
    const { container } = render(
      <ProductCollectionSection
        {...section}
        tabs={section.tabs?.slice(0, 1)}
        copy={copy}
        locale={locale}
      />,
    );
    expect(root(container, "product-collection").getAttribute("data-variant")).toBe("tabs");
    expect(container.querySelector("[data-slot=product-collection-tab-link]")).toBeNull();
    expect(container.querySelectorAll("[data-slot=product-card]")).toHaveLength(
      section.products.length,
    );
  });
});

describe("the featured product's members (T81)", () => {
  it.each([
    ["overlay", f.featuredProduct.section],
    ["gallery", f.featuredProduct.gallery],
  ] as const)("%s: says so, with the product's name, price and link", (variant, section) => {
    const { container } = render(
      <FeaturedProductSection {...section} variant={variant} copy={copy} locale={locale} />,
    );
    expect(root(container, "featured-product").getAttribute("data-variant")).toBe(variant);
    expect(screen.getByRole("heading", { level: 3, name: section.product.title })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: catalogs.en.sections.featuredProduct.view })
        .getAttribute("href"),
    ).toBe(section.product.href);
  });

  it("gallery: draws every picture at once, the editor's first", () => {
    const section = f.featuredProduct.gallery;
    const { container } = render(
      <FeaturedProductSection {...section} copy={copy} locale={locale} />,
    );
    const gallery = container.querySelector("[data-slot=featured-product-gallery]") as HTMLElement;
    const pictures = within(gallery).getAllByRole("img");
    expect(pictures).toHaveLength(section.gallery?.length ?? 0);
    expect(pictures[0]?.getAttribute("alt")).toBe(section.image.alt);
  });
});

describe("the bundle's list and the collection spotlight's stacked look (T81)", () => {
  it("bundle list: a row per product and the sum of the listed prices", () => {
    const section = f.bundle.section;
    const { container } = render(
      <BundleSection {...section} variant="list" copy={copy} locale={locale} />,
    );
    expect(root(container, "bundle").getAttribute("data-variant")).toBe("list");
    expect(container.querySelectorAll("[data-slot=bundle-row]")).toHaveLength(
      section.products.length,
    );
    const total = container.querySelector("[data-slot=bundle-total]") as HTMLElement;
    expect(total.textContent).toContain(catalogs.en.sections.bundle.total);
    const sum = section.products.reduce((all, product) => all + product.price.price.amount, 0);
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: section.products[0]!.price.price.currencyCode,
    }).format(sum);
    expect(total.textContent).toContain(formatted);
  });

  it("bundleTotal: adds the prices to the cent, says 'from' when one varies, none for two currencies", () => {
    const [a, b] = f.bundle.section.products;
    const at = (product: ProductCard, amount: number, varies = false): ProductCard => ({
      ...product,
      price: { price: { ...product.price.price, amount }, varies },
    });
    expect(bundleTotal([at(a!, 0.1), at(b!, 0.2)])?.price.amount).toBe(0.3);
    expect(bundleTotal([at(a!, 10), at(b!, 5, true)])?.varies).toBe(true);
    const other: ProductCard = {
      ...b!,
      price: { price: { amount: 5, currencyCode: "jpy" }, varies: false },
    };
    expect(bundleTotal([at(a!, 10), other])).toBeNull();
  });

  it("collection spotlight, stacked: says so, the picture over the words over the products", () => {
    const section = f.collectionSpotlight.section;
    const { container } = render(
      <CollectionSpotlightSection {...section} variant="stacked" copy={copy} locale={locale} />,
    );
    expect(root(container, "collection-spotlight").getAttribute("data-variant")).toBe("stacked");
    expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
    expect(container.querySelectorAll("[data-slot=product-card]")).toHaveLength(
      section.products.length,
    );
  });
});
