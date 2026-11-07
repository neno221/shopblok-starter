import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroSection, type HeroSectionProps } from "./hero";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("HeroSection", () => {
  it.each(LOCALES)(
    "draws the eyebrow, the heading, the line, the links and the picture, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].hero;
      const { container } = render(
        <HeroSection
          {...section}
          copy={sectionsCopy(catalogs[locale])}
          locale={htmlLang[locale]}
        />,
      );
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
      expect(container.textContent).toContain(section.eyebrow);
      expect(container.textContent).toContain(section.subheading);
      expect(screen.getByRole("img", { name: section.image?.alt })).toBeTruthy();
      expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(
        section.links.map((link) => link.href),
      );
      expect(container.querySelector("[data-slot=hero-products]")).toBeNull();
    },
  );

  it("is the page's h1 when it opens the page, its cards' titles h2, with a countdown", () => {
    const { offer } = sectionFixtures.en.hero;
    render(
      <HeroSection
        {...offer}
        headingLevel={1}
        copy={sectionsCopy(catalogs.en)}
        locale="en-US"
        frozen
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: offer.heading })).toBeTruthy();
    const list = screen.getByRole("list", { name: catalogs.en.organisms.productGrid.label });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getAllByRole("heading", { level: 2 })).toHaveLength(4);
    expect(screen.getByRole("timer")).toBeTruthy();
  });

  it("draws one column without a picture", () => {
    const { long } = sectionFixtures.en.hero;
    const { container } = render(
      <HeroSection {...long} copy={sectionsCopy(catalogs.en)} locale="en-US" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".md\\:grid-cols-2")).toBeNull();
  });
});

// T80 (M5 plan §1a): the hero's other seven members, each drawn by the family's entry file from
// the block's `variant`, each saying which it is on its section (`data-variant`, D99).
describe("HeroSection's members (T80)", () => {
  const f = sectionFixtures.en.hero;
  const copy = sectionsCopy(catalogs.en);
  const draw = (section: (typeof f)[keyof typeof f], over: Partial<HeroSectionProps> = {}) =>
    render(<HeroSection {...section} copy={copy} locale="en-US" frozen {...over} />).container;
  const root = (container: HTMLElement) =>
    container.querySelector("[data-slot=hero-section]") as HTMLElement;

  it.each([
    ["standard", f.section],
    ["overlay", f.overlay],
    ["centered", { ...f.section, variant: "centered" as const }],
    ["editorial", f.editorial],
    ["bento", f.bento],
    ["collection-switcher", f.collections],
    ["product", f.product],
    ["text", { ...f.section, variant: "text" as const }],
  ])("draws the %s member, which says so", (variant, section) => {
    const container = draw(section);
    expect(root(container).getAttribute("data-variant")).toBe(variant);
    expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
  });

  it("overlay: the picture under the words, which sit on the overlay scrim, and says a picture is behind them (D103)", () => {
    const container = draw(f.overlay, { headingLevel: 1 });
    expect(root(container).hasAttribute("data-under-header")).toBe(true);
    const scrim = container.querySelector("[data-slot=hero-scrim]") as HTMLElement;
    expect(scrim.className).toContain("bg-overlay");
    expect(scrim.className).toContain("text-overlay-foreground");
    expect(within(scrim).getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByRole("img", { name: f.overlay.image?.alt })).toBeTruthy();
  });

  it("overlay without a picture does not say one is behind its words", () => {
    const { image: _, ...rest } = f.overlay;
    const container = draw(rest);
    expect(root(container).hasAttribute("data-under-header")).toBe(false);
  });

  it("no other member says a picture is behind its words", () => {
    for (const section of [f.section, f.editorial, f.bento, f.collections, f.product]) {
      const container = draw(section);
      expect(root(container).hasAttribute("data-under-header"), section.variant).toBe(false);
      container.remove();
    }
    expect(root(draw({ ...f.section, variant: "text" })).hasAttribute("data-under-header")).toBe(
      false,
    );
  });

  it("editorial: both pictures", () => {
    draw(f.editorial);
    expect(screen.getByRole("img", { name: f.editorial.image?.alt })).toBeTruthy();
    expect(screen.getByRole("img", { name: f.editorial.secondImage?.alt })).toBeTruthy();
  });

  it("bento: the message and the four products as a named list, or the picture without products", () => {
    draw(f.bento);
    const list = screen.getByRole("list", { name: catalogs.en.organisms.productGrid.label });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getAllByRole("heading", { level: 3 })).toHaveLength(4);
    const alone = draw({ ...f.section, variant: "bento" });
    expect(alone.querySelector("[data-slot=hero-products]")).toBeNull();
    expect(alone.querySelector("[data-slot=hero-image]")).not.toBeNull();
  });

  it("product: the first product's name one level down, its price and the way to its page", () => {
    const [product] = f.product.products;
    const container = draw(f.product, { headingLevel: 1 });
    expect(screen.getByRole("heading", { level: 2, name: product?.title })).toBeTruthy();
    const link = container.querySelector("[data-slot=hero-product-link]") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(product?.href);
    expect(link.textContent).toBe(catalogs.en.sections.featuredProduct.view);
    expect(container.querySelector("[data-slot=price-block]")).not.toBeNull();
    // Its picture is the product's when the editor gave none.
    expect(screen.getByRole("img", { name: product?.images[0]?.alt })).toBeTruthy();
  });

  it("text: no picture, even one the editor gave", () => {
    const container = draw({ ...f.section, variant: "text" });
    expect(container.querySelector("img")).toBeNull();
  });

  it("collection-switcher: without scripts, the collections' links over the first one's picture and link", () => {
    const markup = renderToStaticMarkup(
      <HeroSection {...f.collections} copy={copy} locale="en-US" frozen />,
    );
    const host = document.createElement("div");
    host.innerHTML = markup;
    // The tabs are the browser's: the server's HTML has none of them.
    expect(host.querySelector("[data-slot=hero-collection-tabs]")).toBeNull();
    const list = host.querySelector("[data-slot=hero-collection-list] ul") as HTMLElement;
    const heading = host.querySelector("[data-slot=hero-heading]") as HTMLElement;
    expect(list.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(
      [...list.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]),
    ).toEqual((f.collections.collections ?? []).map((each) => [each.title, each.href]));
    const shop = host.querySelector("[data-slot=hero-collection-link]") as HTMLAnchorElement;
    expect(shop.getAttribute("href")).toBe(f.collections.collections?.[0]?.href);
    expect(shop.textContent).toBe(
      `${catalogs.en.sections.collectionSpotlight.shop}: ${f.collections.collections?.[0]?.title}`,
    );
  });
});
