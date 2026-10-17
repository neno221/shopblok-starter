import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import type { ProductCard } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../../test-support/long-labels";
import { ProductCardBordered } from "./bordered";
import { ProductCardCompact } from "./compact";
import { ProductCardEditorial } from "./editorial";
import { ProductCardHorizontal } from "./horizontal";
import { ProductCardImageSwap } from "./image-swap";
import { ProductCardMinimal } from "./minimal";
import { ProductCardOverlay } from "./overlay";
import type { ProductCardProps, QuickAddProps } from "./parts";
import { ProductCardQuickAdd } from "./quick-add";
import { ProductCardStandard } from "./standard";
import { ProductCardSwatches } from "./swatches";

// The shared rules of the ten variants (T32): one link per card, named by the full title, with
// nothing interactive inside it and nothing positioned between it and the card; a clamped title;
// the badges, the price and the rating; a long German and Greek title; the keyboard.

type Locale = (typeof LOCALES)[number];

const sizes = "(min-width: 768px) 25vw, 50vw";

/** Every variant, with the props only it takes. */
const variants: {
  name: string;
  Card: (props: ProductCardProps & QuickAddProps) => React.ReactNode;
  /** The props only this variant takes (the quick-add form's action). */
  extra?: QuickAddProps;
  /** The title's clamp: compact keeps one line. */
  lines?: 1 | 2;
  /** The variants that keep only the sold-out mark of the badges. */
  soldOutOnly?: boolean;
  /** The variants that draw the rating. */
  rating?: boolean;
}[] = [
  { name: "standard", Card: ProductCardStandard, rating: true },
  { name: "swatches", Card: ProductCardSwatches, rating: true },
  {
    name: "quick-add",
    Card: ProductCardQuickAdd,
    extra: { action: "/cart/add", status: "idle" },
    rating: true,
  },
  { name: "overlay", Card: ProductCardOverlay },
  { name: "minimal", Card: ProductCardMinimal, soldOutOnly: true },
  { name: "horizontal", Card: ProductCardHorizontal, rating: true },
  { name: "compact", Card: ProductCardCompact, lines: 1, soldOutOnly: true },
  { name: "editorial", Card: ProductCardEditorial, rating: true },
  { name: "bordered", Card: ProductCardBordered, rating: true },
  { name: "image-swap", Card: ProductCardImageSwap, rating: true },
];

const INTERACTIVE =
  'a, button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [role="button"], [role="link"], [contenteditable]';

function setup(locale: Locale, product: ProductCard) {
  const { market } = commerceFixtures[locale];
  const { molecules } = catalogs[locale];
  return {
    product,
    copy: { card: molecules.productCard, priceBlock: molecules.priceBlock },
    locale: market.htmlLang,
    sizes,
  };
}

const product = (locale: Locale, handle: string) => {
  const found = commerceFixtures[locale].products.find((candidate) => candidate.handle === handle);
  if (found === undefined) throw new Error(`no ${locale} product ${handle}`);
  return found;
};

describe.each(variants)("ProductCard · $name", ({ name, Card, extra = {}, lines = 2, rating }) => {
  const draw = (locale: Locale, card: ProductCard, props: Record<string, unknown> = {}) =>
    render(<Card {...setup(locale, card)} {...(extra as QuickAddProps)} {...props} />);

  it("is an article with the variant on it, and the title as its heading", () => {
    const hoodie = commerceFixtures.en.products[0]!;
    const { container } = draw("en", hoodie);
    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    expect(article?.getAttribute("data-slot")).toBe("product-card");
    expect(article?.getAttribute("data-variant")).toBe(name);
    const heading = screen.getByRole("heading", { level: 3, name: hoodie.title });
    expect(within(heading).getByRole("link")).toBeTruthy();
  });

  it("takes another heading element", () => {
    draw("en", commerceFixtures.en.products[0]!, { heading: "h2" });
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("is one link, to the product, named by the full title", () => {
    const hoodie = commerceFixtures.en.products[0]!;
    const { container } = draw("en", hoodie);
    const links = within(container).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe(hoodie.href);
    expect(links[0]?.textContent).toBe(hoodie.title);
    expect(screen.getByRole("link", { name: hoodie.title })).toBe(links[0]);
  });

  it("has nothing interactive inside the link (axe: nested-interactive)", () => {
    const { container } = draw("en", commerceFixtures.en.products[0]!);
    const link = within(container).getByRole("link");
    expect(link.querySelector(INTERACTIVE)).toBeNull();
  });

  it("stretches the link over the card: the card is the only positioned box above it", () => {
    const { container } = draw("en", commerceFixtures.en.products[0]!);
    const article = container.querySelector("article") as HTMLElement;
    const link = within(container).getByRole("link");
    expect(article.className).toMatch(/(^|\s)relative(\s|$)/);
    expect(link.className).toContain("after:absolute");
    expect(link.className).toContain("after:inset-0");
    // A positioned or transformed box between the link and the card would become the box the
    // `::after` is stretched over, and the card would not be clickable.
    const makesABox =
      /(^|\s)(relative|absolute|fixed|sticky|transform|translate-|scale-|rotate-|will-change|contain-|isolate)/;
    for (let node = link.parentElement; node && node !== article; node = node.parentElement)
      expect(node.getAttribute("class") ?? "", node.outerHTML.slice(0, 80)).not.toMatch(makesABox);
  });

  it(`clamps the title to ${lines} line${lines === 1 ? "" : "s"}, marks the clamp, and keeps the full text`, () => {
    const { long } = commerceFixtures.en;
    const { container } = draw("en", long.product);
    const link = within(container).getByRole("link");
    const clamped = link.querySelector("[data-truncate]");
    expect(clamped).not.toBeNull();
    expect(clamped?.className).toContain(`line-clamp-${lines}`);
    expect(clamped?.textContent).toBe(long.product.title);
    expect(screen.getByRole("link", { name: long.product.title })).toBe(link);
    // The clamp is the only place text is cut.
    for (const element of container.querySelectorAll("*"))
      if (!element.hasAttribute("data-truncate"))
        expect(element.getAttribute("class") ?? "").not.toMatch(CLIPPING_CLASSES);
  });

  it("is a 44 px target, with the focus ring on the whole card at full strength", () => {
    const { container } = draw("en", commerceFixtures.en.products[0]!);
    const link = within(container).getByRole("link");
    expect(link.className).toContain("min-h-11");
    expect(link.className).toContain("focus-visible:after:ring-ring");
    expect(link.className).toContain("focus-visible:after:ring-3");
    expect(link.className).not.toContain("ring-ring/");
    // The atom's own ring on the title's text is off: the card's is the one drawn.
    expect(link.className).toContain("focus-visible:ring-0");
  });

  it("is reached with Tab, and Enter activates the link", async () => {
    const user = userEvent.setup();
    const { container } = draw("en", commerceFixtures.en.products[0]!);
    const link = within(container).getByRole("link");
    let clicks = 0;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      clicks += 1;
    });
    await user.tab();
    expect(document.activeElement).toBe(link);
    await user.keyboard("{Enter}");
    expect(clicks).toBe(1);
  });

  it("shows the first picture, named by its alt", () => {
    const hoodie = commerceFixtures.en.products[0]!;
    const { container } = draw("en", hoodie);
    expect(within(container).getByRole("img", { name: hoodie.images[0]!.alt })).toBeTruthy();
  });

  it("hands the sizes it was given to the picture", () => {
    // A path, not a data URI: next/image drops `sizes` for a source it does not resize.
    const first = { src: "/media/hoodie-front.png", alt: "The front", width: 600, height: 800 };
    const { container } = draw("en", { ...commerceFixtures.en.products[0]!, images: [first] });
    expect(within(container).getByRole("img", { name: "The front" }).getAttribute("sizes")).toBe(
      sizes,
    );
  });

  it("keeps its frame when there is no picture", () => {
    const { container } = draw("en", { ...commerceFixtures.en.products[0]!, images: [] });
    expect(
      container.querySelector("[data-slot=product-card-no-image], [data-slot=image]"),
    ).not.toBeNull();
    expect(within(container).getAllByRole("link")).toHaveLength(1);
  });

  it("shows the price in the market's format, a sale with both labels", () => {
    const sale = product("en", "brushed-fleece-hoodie");
    const { container } = draw("en", sale);
    const price = container.querySelector("[data-slot=price-block]");
    expect(price?.textContent).toContain("Sale price $54.00");
    expect(price?.textContent).toContain("Original price $75.00");
    expect(price?.querySelector("s")).not.toBeNull();
  });

  it("says that the price is a starting price when the variants differ", () => {
    const { container } = draw("en", product("en", "canvas-tote-bag"));
    expect(container.querySelector("[data-slot=price-from]")?.textContent).toBe("From");
  });

  it(rating ? "names the rating and draws its count" : "leaves the rating out", () => {
    const hoodie = commerceFixtures.en.products[0]!;
    const { container } = draw("en", hoodie);
    const stars = container.querySelector("[data-slot=rating]");
    if (rating !== true) {
      expect(stars).toBeNull();
      return;
    }
    expect(stars?.getAttribute("aria-label")).toBe("4.6 out of 5, 128 reviews");
    expect(container.querySelector("[data-slot=product-card-rating]")?.textContent).toBe("(128)");
  });

  it("shows nothing of a rating that does not exist", () => {
    const { rating: _rating, ...unrated } = commerceFixtures.en.products[0]!;
    const { container } = draw("en", unrated);
    expect(container.querySelector("[data-slot=rating]")).toBeNull();
    expect(container.querySelector("[data-slot=product-card-rating]")).toBeNull();
  });

  it("marks a sold-out product", () => {
    const soldOut = product("en", "garment-dyed-hoodie");
    const { container } = draw("en", soldOut);
    expect(container.querySelector("article")?.hasAttribute("data-sold-out")).toBe(true);
    const marks = container.querySelectorAll("[data-kind=sold-out]");
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe("Sold out");
  });

  it.each(LOCALES)(
    "renders every product of the %s fixtures: one link, nothing nested",
    (locale) => {
      for (const card of commerceFixtures[locale].products) {
        const { container, unmount } = draw(locale, card);
        const links = within(container).getAllByRole("link");
        expect(links, card.handle).toHaveLength(1);
        expect(links[0]?.textContent, card.handle).toBe(card.title);
        expect(links[0]?.querySelector(INTERACTIVE), card.handle).toBeNull();
        unmount();
      }
    },
  );

  it.each(["de", "el"] as const)("keeps a long %s title whole as the link's name", (locale) => {
    const { long } = commerceFixtures[locale];
    const { container } = draw(locale, long.product);
    expect(within(container).getAllByRole("link")).toHaveLength(1);
    const link = screen.getByRole("link", { name: long.product.title });
    expect(link.querySelector("[data-truncate]")?.className).toContain(`line-clamp-${lines}`);
    expect(link.className).toContain("min-h-11");
    // The long title is wrapped, not pushed out: it may break inside a word.
    expect(link.querySelector("[data-truncate]")?.className).toContain("wrap-anywhere");
  });

  it("writes no English on a Greek card", () => {
    const sale = { ...product("el", "brushed-fleece-hoodie") };
    const { container } = draw("el", { ...sale, stock: { status: "out", quantity: 0 } });
    const text = container.textContent ?? "";
    const english = catalogs.en.molecules;
    expect(text).not.toContain(english.productCard.soldOut);
    expect(text).not.toContain(english.productCard.badges.sale);
    expect(text).not.toContain(english.priceBlock.sale);
    expect(text).not.toContain("reviews");
    expect(text).toContain(catalogs.el.molecules.productCard.soldOut);
  });
});

describe("the sizes", () => {
  it("are required by the type: a card that left them out would download a full-width picture", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { sizes: _sizes, ...withoutSizes } = setup("en", commerceFixtures.en.products[0]!);
    // @ts-expect-error -- `sizes` is required (T32, PR 43 review, item 13).
    render(<ProductCardStandard {...withoutSizes} />);
    warn.mockRestore();
  });
});

describe("the badges", () => {
  const draw = (card: ProductCard, Card = ProductCardStandard) => {
    const view = render(<Card {...setup("en", card)} />);
    return [...view.container.querySelectorAll("[data-kind]")].map((badge) => ({
      kind: badge.getAttribute("data-kind"),
      text: badge.textContent,
    }));
  };
  const base = commerceFixtures.en.products[0]!;

  it("shows the sale badge on a sale and the new badge on a new product", () => {
    expect(draw(product("en", "brushed-fleece-hoodie"))).toEqual([{ kind: "sale", text: "Sale" }]);
    expect(draw(base)).toEqual([{ kind: "new", text: "New" }]);
  });

  it("shows the merchant's own label", () => {
    expect(draw(product("en", "organic-cotton-cap"))).toEqual([
      { kind: "custom", text: "Limited edition" },
    ]);
  });

  it("shows at most two, sold out first, then sale, new, bestseller and the custom label", () => {
    const everything: ProductCard = {
      ...base,
      stock: { status: "out", quantity: 0 },
      badges: [
        { kind: "custom", label: "Pre-order" },
        { kind: "bestseller" },
        { kind: "new" },
        { kind: "sale" },
      ],
    };
    expect(draw(everything)).toEqual([
      { kind: "sold-out", text: "Sold out" },
      { kind: "sale", text: "Sale" },
    ]);
    expect(draw({ ...everything, stock: { status: "in-stock" } })).toEqual([
      { kind: "sale", text: "Sale" },
      { kind: "new", text: "New" },
    ]);
    expect(
      draw({ ...base, badges: [{ kind: "custom", label: "Pre-order" }, { kind: "bestseller" }] }),
    ).toEqual([
      { kind: "bestseller", text: "Bestseller" },
      { kind: "custom", text: "Pre-order" },
    ]);
  });

  it("keeps only the sold-out mark in the minimal and compact variants", () => {
    const sale = product("en", "garment-dyed-hoodie");
    for (const Card of [ProductCardMinimal, ProductCardCompact]) {
      expect(draw({ ...sale, badges: [{ kind: "sale" }] }, Card)).toEqual([
        { kind: "sold-out", text: "Sold out" },
      ]);
      expect(draw(base, Card)).toEqual([]);
    }
  });

  it("puts the badges over the picture, top-start, in the variants that draw them there", () => {
    const { container } = render(<ProductCardStandard {...setup("en", base)} />);
    const badges = container.querySelector("[data-slot=product-card-badges]");
    expect(badges?.className).toContain("absolute");
    expect(badges?.className).toContain("top-2");
    expect(badges?.className).toContain("inset-x-2");
    expect(badges?.className).not.toMatch(/(^|\s)(left|right)-/);
  });

  it("draws the sale and new badges in the badge tokens", () => {
    const { container } = render(
      <ProductCardStandard
        {...setup("en", { ...base, badges: [{ kind: "sale" }, { kind: "new" }] })}
      />,
    );
    expect(container.querySelector("[data-kind=sale]")?.className).toContain("bg-badge-sale");
    expect(container.querySelector("[data-kind=sale]")?.className).toContain(
      "text-badge-sale-foreground",
    );
    expect(container.querySelector("[data-kind=new]")?.className).toContain("bg-badge-new");
  });

  it.each(["de", "el"] as const)("wraps a long %s custom label inside its badge", (locale) => {
    const { long } = commerceFixtures[locale];
    const { container } = render(<ProductCardStandard {...setup(locale, long.product)} />);
    const custom = container.querySelector("[data-kind=custom]");
    expect(custom?.className).toContain("wrap-anywhere");
    // A wrapped label keeps its corners off the text.
    expect(custom?.className).toContain("rounded-xl");
    expect(custom?.className).not.toContain("rounded-4xl");
    expect(custom?.className).not.toMatch(CLIPPING_CLASSES);
    expect(custom?.textContent).toBe(long.product.badges.find((b) => b.kind === "custom")?.label);
  });
});

describe("the rating", () => {
  const draw = (locale: Locale, count: number, average: number) => {
    const card = { ...commerceFixtures[locale].products[0]!, rating: { average, count } };
    const view = render(<ProductCardStandard {...setup(locale, card)} />);
    return view.container.querySelector("[data-slot=rating]")?.getAttribute("aria-label");
  };

  it("reads the average and the count with the right plural, in each language", () => {
    expect(draw("en", 1, 5)).toBe("5 out of 5, 1 review");
    expect(draw("en", 128, 4.6)).toBe("4.6 out of 5, 128 reviews");
    expect(draw("de", 1, 4.5)).toBe("4,5 von 5, 1 Bewertung");
    expect(draw("de", 2, 4.5)).toBe("4,5 von 5, 2 Bewertungen");
    expect(draw("el", 1, 4.5)).toBe("4,5 στα 5, 1 αξιολόγηση");
    expect(draw("el", 2, 4.5)).toBe("4,5 στα 5, 2 αξιολογήσεις");
    expect(draw("fr", 1, 4.5)).toBe("4,5 sur 5, 1 avis");
    expect(draw("fr", 7, 4.5)).toBe("4,5 sur 5, 7 avis");
  });

  it("draws a large count in the market's grouping", () => {
    const card = { ...commerceFixtures.de.long.product };
    const { container } = render(<ProductCardStandard {...setup("de", card)} />);
    expect(container.querySelector("[data-slot=product-card-rating]")?.textContent).toBe("(1.284)");
  });

  it("shows no rating for a product with no reviews", () => {
    const card = { ...commerceFixtures.en.products[0]!, rating: { average: 0, count: 0 } };
    const { container } = render(<ProductCardStandard {...setup("en", card)} />);
    expect(container.querySelector("[data-slot=rating]")).toBeNull();
  });

  it("hides the drawn count from assistive technology, which has the label", () => {
    const { container } = render(
      <ProductCardStandard {...setup("en", commerceFixtures.en.products[0]!)} />,
    );
    const count = container.querySelector("[data-slot=product-card-rating] > span");
    expect(count?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("the variants differ", () => {
  it("each has its own composition", () => {
    const hoodie = commerceFixtures.en.products[0]!;
    const shapes = new Set<string>();
    for (const { Card, extra = {} } of variants) {
      const { container, unmount } = render(
        <Card {...setup("en", hoodie)} {...(extra as QuickAddProps)} />,
      );
      shapes.add(container.innerHTML.replace(/data-variant="[^"]*"/, ""));
      unmount();
    }
    expect(shapes.size).toBe(variants.length);
  });

  it("lays out the horizontal card as a row with the picture first, and the compact one small", () => {
    const hoodie = commerceFixtures.en.products[0]!;
    const horizontal = render(<ProductCardHorizontal {...setup("en", hoodie)} />);
    const row = horizontal.container.querySelector("article") as HTMLElement;
    expect(row.className).toContain("flex");
    expect(row.className).not.toContain("flex-col");
    expect(row.firstElementChild?.getAttribute("data-slot")).toBe("product-card-media");
    expect(row.firstElementChild?.className).toContain("w-24");
    horizontal.unmount();
    const compact = render(<ProductCardCompact {...setup("en", hoodie)} />);
    expect(compact.container.querySelector("[data-slot=product-card-media]")?.className).toContain(
      "w-16",
    );
  });

  it("draws the editorial picture 2:3 and the title large", () => {
    const hoodie = commerceFixtures.en.products[0]!;
    const { container } = render(<ProductCardEditorial {...setup("en", hoodie)} />);
    const frame = container.querySelector("[data-slot=image]");
    expect(frame?.className).toContain("aspect-[2/3]");
    expect(frame?.className).not.toContain("aspect-[3/4]");
    expect(container.querySelector("h3")?.className).toContain("text-xl");
    expect(container.querySelector("[data-slot=price]")?.className).toContain("text-xl");
  });

  it("puts the bordered card in a bordered, padded box on the card tokens", () => {
    const hoodie = commerceFixtures.en.products[0]!;
    const { container } = render(<ProductCardBordered {...setup("en", hoodie)} />);
    const article = container.querySelector("article");
    for (const token of ["border", "p-3", "bg-card", "rounded-xl"])
      expect(article?.className).toContain(token);
    expect(within(container).getByRole("link").className).toContain("after:rounded-xl");
  });

  it("leaves the minimal card with a picture, a title and a price only", () => {
    const { container } = render(
      <ProductCardMinimal {...setup("en", commerceFixtures.en.products[0]!)} />,
    );
    expect(container.querySelector("[data-slot=rating]")).toBeNull();
    expect(container.querySelector("[data-slot=product-card-swatches]")).toBeNull();
    expect(container.querySelector("[data-kind]")).toBeNull();
    expect(container.querySelector("article")?.className).toContain("text-center");
  });
});

describe("the overlay card", () => {
  const draw = (card: ProductCard) => {
    const view = render(<ProductCardOverlay {...setup("en", card)} />);
    return view.container;
  };

  it("sets the title and the price on an opaque panel of the page's background", () => {
    const container = draw(commerceFixtures.en.products[0]!);
    const panel = container.querySelector("[data-slot=product-card-panel]") as HTMLElement;
    expect(panel.className).toContain("bg-background");
    expect(panel.className).not.toMatch(/bg-background\/|bg-black|bg-white/);
    expect(panel.className).toContain("text-foreground");
    expect(within(panel).getByRole("link")).toBeTruthy();
    expect(panel.querySelector("[data-slot=price-block]")).not.toBeNull();
  });

  it("layers the panel over the picture in one grid cell, without positioning it", () => {
    const container = draw(commerceFixtures.en.products[0]!);
    const panel = container.querySelector("[data-slot=product-card-panel]") as HTMLElement;
    const media = container.querySelector("[data-slot=product-card-media]") as HTMLElement;
    const article = container.querySelector("article") as HTMLElement;
    expect(article.className).toContain("grid");
    for (const element of [panel, media]) {
      expect(element.className).toContain("col-start-1");
      expect(element.className).toContain("row-start-1");
    }
    expect(panel.className).toContain("self-end");
    // Above the picture, which is positioned itself.
    expect(panel.className).toContain("z-10");
    expect(panel.className).not.toMatch(/(^|\s)(relative|absolute|fixed|sticky)(\s|$)/);
  });

  it("keeps the rating and the swatches off the panel", () => {
    const container = draw(commerceFixtures.en.products[0]!);
    expect(container.querySelector("[data-slot=rating]")).toBeNull();
  });
});
