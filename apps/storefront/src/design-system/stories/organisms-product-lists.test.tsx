// Ours (T37, SETUP.md "Listing organisms (T37)").
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { CompareTray } from "@shopblok/ui/organisms/compare-tray";
import { ProductCarousel } from "@shopblok/ui/organisms/product-carousel";
import { ProductGrid } from "@shopblok/ui/organisms/product-grid";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompareTrayDemo } from "../components/compare-tray-demo";
import { OverlayBox } from "../components/overlay-box";
import { createContext } from "../context";
import { productListOrganismStories } from "./organisms-product-lists";

// The stories of ProductGrid, ProductCarousel and CompareTray (T37; D40, D44, D45, D46): the states
// the task lists are there, each shows what its description says in every locale, every landmark of
// the page is named apart, the compare tray is drawn in boxes tall enough for it, nothing a state
// does moves, every link is told not to prefetch, and the props that reach a client part
// serialize, because a story renders on the server. A story renders to static markup here (the
// storefront's tests have no DOM), so what the components do when they are used is the ui package's
// test (the grid's, the carousel's with embla and the tray's with focus). The heights of the boxes
// and the layout at 375, 768 and 1440 px in the four languages were measured in headless Chromium
// (the numbers are in the comments of the constants in the stories' file), and the design system's
// own browser checks are the lead's.

/** The one character the house style leaves out of every sentence. */
const EM_DASH = String.fromCharCode(0x2014);

type Id = keyof typeof productListOrganismStories;

const grid = "organisms/product-grid";
const carousel = "organisms/product-carousel";
const tray = "organisms/compare-tray";

const story = (id: Id) => productListOrganismStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
const live = (id: Id, locale: Locale) =>
  renderToStaticMarkup(story(id).live(createContext(locale)));
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)].length;
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const listing = (locale: Locale) => commerceFixtures[locale].listing;
const organisms = (locale: Locale) => catalogs[locale].organisms;

/** The elements a story returns are the components themselves: their props are what the story chose. */
function rendered<Props>(node: ReactNode, type: unknown): ReactElement<Props> {
  if (!isValidElement<Props>(node) || node.type !== type) throw new Error("not the component");
  return node;
}
/** What is inside the overlay box a story draws. */
function boxed(node: ReactNode): { height: number; name: string; children: ReactElement[] } {
  const box = rendered<ComponentProps<typeof OverlayBox>>(node, OverlayBox);
  return {
    height: box.props.height ?? 480,
    name: box.props.name,
    children: Children.toArray(box.props.children).filter(isValidElement),
  };
}

const nodeOf = (id: Id, stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  return stateId === undefined ? story(id).live(ctx) : state(id, stateId).render(ctx);
};
const gridProps = (stateId: string | undefined, locale: Locale) =>
  rendered<ComponentProps<typeof ProductGrid>>(nodeOf(grid, stateId, locale), ProductGrid).props;
const carouselProps = (stateId: string | undefined, locale: Locale) =>
  rendered<ComponentProps<typeof ProductCarousel>>(
    nodeOf(carousel, stateId, locale),
    ProductCarousel,
  ).props;
/** The tray a state draws, in its box. */
const trayProps = (stateId: string, locale: Locale) =>
  rendered<ComponentProps<typeof CompareTray>>(
    boxed(nodeOf(tray, stateId, locale)).children[0],
    CompareTray,
  ).props;
/** The live render's tray: the demo, with its products in state. */
const demoProps = (locale: Locale) =>
  rendered<ComponentProps<typeof CompareTrayDemo>>(
    boxed(nodeOf(tray, undefined, locale)).children[0],
    CompareTrayDemo,
  ).props;

const gridStateIds = [
  "grid",
  "list",
  "swatches",
  "quick-add",
  "editorial",
  "few",
  "long-titles",
  "empty",
];
const carouselStateIds = ["standard", "no-view-all", "few", "long-titles", "quick-add"];
const trayStateIds = ["one", "three", "full", "long-titles"];

describe("the listing organisms' stories", () => {
  it("are one for each of the three entries, each with a summary and a11y notes", () => {
    expect(Object.keys(productListOrganismStories).sort()).toEqual([carousel, grid, tray].sort());
    for (const [id, each] of Object.entries(productListOrganismStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.summary.trim().endsWith("."), id).toBe(true);
      expect(each.a11y.length, id).toBeGreaterThan(0);
      for (const note of each.a11y) {
        expect(note.trim().endsWith("."), `${id}: ${note.slice(0, 30)}`).toBe(true);
        // Full sentences: a capital to begin with, and more than a label's worth of words.
        expect(note.trim().split(/\s+/).length, `${id}: ${note.slice(0, 30)}`).toBeGreaterThan(8);
      }
    }
  });

  it("have the states the task lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(grid)).toEqual(gridStateIds);
    expect(ids(carousel)).toEqual(carouselStateIds);
    expect(ids(tray)).toEqual(trayStateIds);
  });

  it("give each state a distinct id, a label and a description", () => {
    for (const [id, each] of Object.entries(productListOrganismStories)) {
      const ids = (each.states ?? []).map((part) => part.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      const labels = (each.states ?? []).map((part) => part.label);
      expect(new Set(labels).size, id).toBe(labels.length);
      for (const part of each.states ?? []) {
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
        expect(part.description?.trim() ?? "", `${id} ${part.id}`).not.toBe("");
      }
    }
  });

  it("lay the states out one under another: a listing is as wide as the window", () => {
    for (const each of Object.values(productListOrganismStories)) {
      expect(each.statesLayout).toBe("stack");
    }
  });

  it("use no em dash anywhere in their words", () => {
    for (const [id, each] of Object.entries(productListOrganismStories)) {
      const words = [
        each.summary,
        ...each.a11y,
        ...(each.states ?? []).flatMap((part) => [part.label, part.description ?? ""]),
      ];
      for (const text of words) expect(text, id).not.toContain(EM_DASH);
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(productListOrganismStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(300);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(300);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
        expect(markup, `${id} ${part.id}`).not.toContain(EM_DASH);
      }
    }
  });

  it("tell every link not to prefetch, in the live renders and every state", () => {
    for (const locale of LOCALES) {
      const every = [
        gridProps(undefined, locale),
        ...gridStateIds.map((stateId) => gridProps(stateId, locale)),
        carouselProps(undefined, locale),
        ...carouselStateIds.map((stateId) => carouselProps(stateId, locale)),
        demoProps(locale),
        ...trayStateIds.map((stateId) => trayProps(stateId, locale)),
      ];
      for (const props of every) expect(props.prefetch).toBe(false);
    }
  });

  it("give the components props that serialize (a story renders on the server)", () => {
    for (const locale of LOCALES) {
      const every = [
        gridProps(undefined, locale),
        ...gridStateIds.map((stateId) => gridProps(stateId, locale)),
        carouselProps(undefined, locale),
        ...carouselStateIds.map((stateId) => carouselProps(stateId, locale)),
        demoProps(locale),
        ...trayStateIds.map((stateId) => trayProps(stateId, locale)),
      ];
      for (const props of every) {
        expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
        expect(JSON.parse(JSON.stringify(props))).toEqual(props);
      }
    }
  });
});

describe("ProductGrid's stories", () => {
  it("say what the notes of the task ask: the list, the headings, the columns, the list layout, empty", () => {
    const notes = story(grid).a11y.join("\n");
    expect(notes).toMatch(/list named/i);
    expect(notes).toContain(`“${organisms("en").productGrid.label}”`);
    expect(notes).toMatch(/h3/);
    expect(notes).toMatch(/two columns under 768 px, three from 768 px and four from 1024 px/i);
    expect(notes).toMatch(/horizontal card/i);
    expect(notes).toMatch(/empty state/i);
    expect(notes).toMatch(/44 px/);
  });

  describe("the live render", () => {
    it.each(LOCALES)(
      "is the fixture's twelve cards in a grid, under the section's h2, in %s",
      (locale) => {
        const props = gridProps(undefined, locale);
        expect(props.products).toEqual(listing(locale).grid.products.products);
        expect(props.products).toHaveLength(12);
        expect(props.variant).toBe("standard");
        expect(props.layout).toBe("grid");
        expect(props.heading).toBe("h3");
        expect(props.locale).toBe(htmlLang(locale));
        expect(props.copy.grid.label).toBe(organisms(locale).productGrid.label);
        expect(props.copy.card).toEqual(catalogs[locale].molecules.productCard);
        expect(props.copy.priceBlock).toEqual(catalogs[locale].molecules.priceBlock);
      },
    );

    it.each(LOCALES)(
      "draws the list named by the catalog, with a card in each item, in %s",
      (locale) => {
        const markup = live(grid, locale);
        expect(markup).toContain(`aria-label="${organisms(locale).productGrid.label}"`);
        expect(count(markup, /<li[^>]*data-slot="product-grid-item"/g)).toBe(12);
        expect(count(markup, /<article[^>]*data-slot="product-card"/g)).toBe(12);
        expect(markup).toContain('data-layout="grid"');
      },
    );
  });

  describe("the states", () => {
    it.each(LOCALES)("draw the grid the standard card, eight of them, in %s", (locale) => {
      const props = gridProps("grid", locale);
      expect(props.products).toEqual(listing(locale).grid.products.products.slice(0, 8));
      expect(props.layout).toBe("grid");
      expect(props.variant).toBe("standard");
      expect(count(html(grid, "grid", locale), /<article/g)).toBe(8);
    });

    it.each(LOCALES)(
      "draw the list layout as one card to a row, whatever the variant, in %s",
      (locale) => {
        const props = gridProps("list", locale);
        expect(props.layout).toBe("list");
        expect(props.products).toHaveLength(5);
        const markup = html(grid, "list", locale);
        expect(markup).toContain('data-layout="list"');
        expect(count(markup, /<article/g)).toBe(5);
      },
    );

    it("pick the variant the state is named for", () => {
      expect(gridProps("swatches", "en").variant).toBe("swatches");
      expect(gridProps("editorial", "en").variant).toBe("editorial");
      expect(gridProps("quick-add", "en").variant).toBe("quick-add");
    });

    it.each(LOCALES)(
      "give the quick-add form its action once and each status by product, in %s",
      (locale) => {
        const props = gridProps("quick-add", locale);
        const products = props.products;
        expect(props.quickAdd?.action).toBe(listing(locale).filters.action);
        expect(props.quickAdd?.status).toEqual({
          [products[1]?.id ?? ""]: "adding",
          [products[2]?.id ?? ""]: "added",
          [products[3]?.id ?? ""]: "error",
        });
        const markup = html(grid, "quick-add", locale);
        expect(count(markup, /<form/g)).toBe(4);
        expect(markup).toContain(`action="${listing(locale).filters.action}"`);
      },
    );

    it.each(LOCALES)("draw three products and leave the last row short, in %s", (locale) => {
      expect(gridProps("few", locale).products).toHaveLength(3);
      expect(count(html(grid, "few", locale), /<article/g)).toBe(3);
    });

    it.each(LOCALES)("lead with the longest title the copy allows, in %s", (locale) => {
      const long = commerceFixtures[locale].long.product;
      const props = gridProps("long-titles", locale);
      expect(props.products[0]).toEqual(long);
      expect(props.products).toHaveLength(4);
      expect(html(grid, "long-titles", locale)).toContain(long.href);
    });

    it.each(LOCALES)(
      "draw the empty state and no list when there are no products, in %s",
      (locale) => {
        const props = gridProps("empty", locale);
        expect(props.products).toEqual([]);
        expect(props.empty).toEqual(listing(locale).grid.empty.empty);
        const markup = html(grid, "empty", locale);
        expect(markup).toContain('data-state="empty"');
        expect(markup).toContain(props.empty.title);
        expect(markup).not.toContain("<ul");
        expect(markup).not.toContain('data-slot="product-card"');
      },
    );

    it("sit under their own label: the cards' titles are h4 and the empty state's too", () => {
      for (const stateId of gridStateIds) {
        const props = gridProps(stateId, "en");
        expect(props.heading, stateId).toBe("h4");
        expect(props.emptyHeading, stateId).toBe(4);
      }
      expect(html(grid, "grid", "en")).toContain("<h4");
      expect(html(grid, "grid", "en")).not.toContain("<h3");
      expect(html(grid, "empty", "en")).toMatch(/<h4[^>]*>[^<]*No products match/);
    });
  });

  describe("the landmarks", () => {
    it.each(LOCALES)("name each list apart: the state's label in brackets, in %s", (locale) => {
      const names = [
        gridProps(undefined, locale).copy.grid.label,
        ...gridStateIds.map((stateId) => gridProps(stateId, locale).copy.grid.label),
      ];
      expect(new Set(names).size).toBe(names.length);
      expect(names[0]).toBe(organisms(locale).productGrid.label);
      for (const [index, stateId] of gridStateIds.entries()) {
        expect(names[index + 1], stateId).toBe(
          `${organisms(locale).productGrid.label} (${state(grid, stateId).label})`,
        );
      }
    });
  });
});

describe("ProductCarousel's stories", () => {
  it("say what the notes of the task ask: region, slides, buttons, no autoplay, the status, motion", () => {
    const notes = story(carousel).a11y.join("\n");
    expect(notes).toMatch(/one region named by its heading/i);
    expect(notes).toMatch(/“3 of 8”/);
    expect(notes).toMatch(/never moves on its own/i);
    expect(notes).toMatch(/2\.2\.2/);
    expect(notes).toMatch(/aria-disabled but stays focusable/i);
    expect(notes).toContain(`“${organisms("en").productCarousel.previous}”`);
    expect(notes).toContain(`“${organisms("en").productCarousel.next}”`);
    expect(notes).toMatch(/Showing 5 to 8 of 8/);
    expect(notes).toMatch(/reduced motion/i);
    expect(notes).toMatch(/44 px/);
  });

  describe("the live render", () => {
    it.each(LOCALES)("is the fixture's carousel, under the section's h2, in %s", (locale) => {
      const props = carouselProps(undefined, locale);
      expect(props.title).toBe(listing(locale).carousel.title);
      expect(props.products).toEqual(listing(locale).carousel.products);
      expect(props.products).toHaveLength(8);
      expect(props.viewAll).toEqual(listing(locale).carousel.viewAll);
      expect(props.headingLevel).toBe(3);
      expect(props.locale).toBe(htmlLang(locale));
      expect(props.copy.carousel).toEqual(organisms(locale).productCarousel);
    });

    it.each(LOCALES)(
      "draws one region named by its heading, with a slide for each product, in %s",
      (locale) => {
        const markup = live(carousel, locale);
        expect(count(markup, /role="region"/g)).toBe(1);
        expect(markup).toContain(
          `aria-roledescription="${organisms(locale).productCarousel.carousel}"`,
        );
        expect(
          count(
            markup,
            /aria-roledescription="[^"]*"\s+data-slot="carousel-item"|data-slot="carousel-item"/g,
          ),
        ).toBe(8);
        expect(markup).toContain(listing(locale).carousel.title);
        expect(markup).toContain('data-slot="product-carousel-status"');
      },
    );
  });

  describe("the states", () => {
    it("are titled with the state's label so that no two regions of the page are named alike", () => {
      for (const locale of LOCALES) {
        const titles = [
          carouselProps(undefined, locale).title,
          ...carouselStateIds.map((stateId) => carouselProps(stateId, locale).title),
        ];
        expect(new Set(titles).size).toBe(titles.length);
        for (const stateId of carouselStateIds) {
          expect(carouselProps(stateId, locale).title).toMatch(
            new RegExp(`\\(${state(carousel, stateId).label}\\)$`),
          );
        }
      }
    });

    it("sit under their own label: the carousel's heading is h4 and the cards' h5", () => {
      for (const stateId of carouselStateIds) {
        expect(carouselProps(stateId, "en").headingLevel, stateId).toBe(4);
      }
      const markup = html(carousel, "standard", "en");
      expect(markup).toContain("<h4");
      expect(count(markup, /<h5/g)).toBe(8);
    });

    it.each(LOCALES)("draw the standard carousel with the link to the listing, in %s", (locale) => {
      const props = carouselProps("standard", locale);
      expect(props.products).toHaveLength(8);
      expect(props.variant).toBe("standard");
      expect(props.viewAll).toEqual(listing(locale).carousel.viewAll);
      expect(html(carousel, "standard", locale)).toContain(`href="${props.viewAll?.href}"`);
    });

    it.each(LOCALES)(
      "draw the heading and the buttons alone with no link to the listing, in %s",
      (locale) => {
        const props = carouselProps("no-view-all", locale);
        expect(props.viewAll).toBeUndefined();
        expect(html(carousel, "no-view-all", locale)).not.toContain("product-carousel-view-all");
      },
    );

    it("draw three products for the carousel that fits from 1024 px", () => {
      expect(carouselProps("few", "en").products).toHaveLength(3);
      expect(count(html(carousel, "few", "en"), /data-slot="carousel-item"/g)).toBe(3);
    });

    it.each(LOCALES)(
      "lead with the longest title the copy allows, in the heading and the first card, in %s",
      (locale) => {
        const long = commerceFixtures[locale].long.product;
        const props = carouselProps("long-titles", locale);
        expect(props.products[0]).toEqual(long);
        expect(props.title.startsWith(long.title)).toBe(true);
        expect(props.products).toHaveLength(6);
      },
    );

    it.each(LOCALES)(
      "give the quick-add cards their action once and each status by product, in %s",
      (locale) => {
        const props = carouselProps("quick-add", locale);
        expect(props.variant).toBe("quick-add");
        expect(props.quickAdd?.action).toBe(listing(locale).filters.action);
        const products = props.products;
        expect(props.quickAdd?.status).toEqual({
          [products[1]?.id ?? ""]: "adding",
          [products[2]?.id ?? ""]: "added",
        });
        expect(count(html(carousel, "quick-add", locale), /<form/g)).toBe(8);
      },
    );

    it("never turn the carousel's motion on: nothing a story passes autoplays", () => {
      for (const stateId of carouselStateIds) {
        const props = carouselProps(stateId, "en");
        expect(Object.keys(props).filter((key) => /auto|play|opts|plugin/i.test(key))).toEqual([]);
      }
    });
  });
});

describe("CompareTray's stories", () => {
  it("say what the notes of the task ask: region not dialog, per visitor, focus, 2.4.11, 44 px", () => {
    const notes = story(tray).a11y.join("\n");
    expect(notes).toContain(`“${organisms("en").compareTray.region}”`);
    expect(notes).toMatch(/not a dialog/i);
    expect(notes).toMatch(/per visitor/i);
    expect(notes).toMatch(/polite live region/i);
    expect(notes).toMatch(/next product's remove button/i);
    expect(notes).toMatch(/control that follows the tray/i);
    expect(notes).toMatch(/2\.4\.11/);
    expect(notes).toMatch(/44 px/);
    expect(notes).toMatch(/four products fit in a row at 375 px/i);
  });

  describe("the live render", () => {
    it.each(LOCALES)(
      "is the real tray with its three products in state, in a box, in %s",
      (locale) => {
        const box = boxed(nodeOf(tray, undefined, locale));
        expect(box.name).toBe(organisms(locale).compareTray.region);
        expect(box.children).toHaveLength(1);
        const props = demoProps(locale);
        const three = listing(locale).compare.three;
        expect(props.chosen).toEqual(three.items);
        expect(props.max).toBe(three.max);
        expect(props.compareHref).toBe(three.compareHref);
        expect(props.copy).toEqual(organisms(locale).compareTray);
        expect(props.locale).toBe(htmlLang(locale));
        // The products are the demo's own state: the story hands it none to show and no handlers.
        expect(props).not.toHaveProperty("items");
        expect(props).not.toHaveProperty("onRemove");
        expect(props).not.toHaveProperty("onClear");
      },
    );

    it("has a way back: the reset button says so in English, and the note says what the page is", () => {
      const props = demoProps("en");
      expect(props.resetLabel.trim()).not.toBe("");
      expect(props.note.trim().endsWith(".")).toBe(true);
      expect(props.resetLabel).not.toContain(EM_DASH);
      expect(props.note).not.toContain(EM_DASH);
    });

    it.each(LOCALES)("draws the tray and the button on the server, in %s", (locale) => {
      const markup = live(tray, locale);
      expect(count(markup, /data-slot="compare-tray"/g)).toBe(1);
      expect(count(markup, /data-slot="compare-tray-remove"/g)).toBe(3);
      expect(markup).toContain(`aria-label="${organisms(locale).compareTray.region}"`);
      expect(markup).toContain('lang="en"');
      expect(markup).toContain(demoProps(locale).resetLabel);
    });

    it("is in a box that holds the tallest ordinary tray at 375 px", () => {
      // Measured in Chromium: at most 396 px (Greek), and the tray's cap is the box's less 2 rem.
      expect(boxed(nodeOf(tray, undefined, "en")).height).toBeGreaterThanOrEqual(396 + 32);
      expect(demoProps("en").className).toBe("max-h-[calc(100%-2rem)]");
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("draw one, three, four and three products, in %s", (locale) => {
      const sizes = Object.fromEntries(
        trayStateIds.map((stateId) => [stateId, trayProps(stateId, locale).items.length]),
      );
      expect(sizes).toEqual({ one: 1, three: 3, full: 4, "long-titles": 3 });
      expect(trayProps("full", locale).max).toBe(4);
      expect(trayProps("one", locale)).toMatchObject({
        items: listing(locale).compare.one.items,
        compareHref: listing(locale).compare.one.compareHref,
      });
    });

    it.each(LOCALES)("draw the tray in a box named for the state, in %s", (locale) => {
      for (const stateId of trayStateIds) {
        const box = boxed(nodeOf(tray, stateId, locale));
        expect(box.name, stateId).toBe(state(tray, stateId).label);
        expect(box.children, stateId).toHaveLength(1);
      }
    });

    it("give every state a box tall enough for its tray at 375 px, with room above", () => {
      // Measured in Chromium at 375 px in en, el, de and fr: an ordinary tray is at most 396 px
      // tall (Greek), the long-titles tray at most 610 px (German); the tray is capped to the
      // box less 2 rem, so it never spills out and scrolls inside itself if it is taller.
      for (const stateId of trayStateIds) {
        const { height } = boxed(nodeOf(tray, stateId, "de"));
        const tallest = stateId === "long-titles" ? 610 : 396;
        expect(height, stateId).toBeGreaterThanOrEqual(tallest + 32);
      }
    });

    it("cap each tray to its box, so that a short window or a long title scrolls inside it", () => {
      for (const stateId of trayStateIds) {
        expect(trayProps(stateId, "en").className, stateId).toBe("max-h-[calc(100%-2rem)]");
      }
    });

    it("lead the long-titles state with the longest title the copy allows", () => {
      for (const locale of LOCALES) {
        const props = trayProps("long-titles", locale);
        expect(props.items[0]?.title).toBe(commerceFixtures[locale].long.product.title);
        expect(props.items[0]?.href).toBe(listing(locale).compare.three.items[0]?.href);
      }
    });

    it("are pictures: no handler, so a click changes nothing", () => {
      for (const stateId of trayStateIds) {
        const props = trayProps(stateId, "en");
        expect(props.onRemove, stateId).toBeUndefined();
        expect(props.onClear, stateId).toBeUndefined();
      }
    });

    it.each(LOCALES)(
      "draw what each description says: the places, the line and the link, in %s",
      (locale) => {
        const one = html(tray, "one", locale);
        expect(count(one, /data-slot="compare-tray-slot"/g)).toBe(3);
        expect(one).toContain('data-slot="compare-tray-need-more"');
        expect(one).not.toContain('data-slot="compare-tray-compare"');
        const three = html(tray, "three", locale);
        expect(count(three, /data-slot="compare-tray-slot"/g)).toBe(1);
        expect(three).toContain('data-slot="compare-tray-compare"');
        expect(three).not.toContain('data-slot="compare-tray-need-more"');
        const full = html(tray, "full", locale);
        expect(count(full, /data-slot="compare-tray-slot"/g)).toBe(0);
        expect(count(full, /data-slot="compare-tray-remove"/g)).toBe(4);
      },
    );
  });

  describe("the landmarks", () => {
    it.each(LOCALES)("name each tray apart: the state's label in brackets, in %s", (locale) => {
      const regions = [
        demoProps(locale).copy.region,
        ...trayStateIds.map((stateId) => trayProps(stateId, locale).copy.region),
      ];
      expect(new Set(regions).size).toBe(regions.length);
      expect(regions[0]).toBe(organisms(locale).compareTray.region);
      for (const [index, stateId] of trayStateIds.entries()) {
        expect(regions[index + 1], stateId).toBe(
          `${organisms(locale).compareTray.region} (${state(tray, stateId).label})`,
        );
      }
    });

    it("keep the rest of the catalog's words as they are", () => {
      for (const stateId of trayStateIds) {
        const { region: _region, ...rest } = trayProps(stateId, "de").copy;
        const { region: _original, ...expected } = organisms("de").compareTray;
        expect(rest, stateId).toEqual(expected);
      }
    });
  });
});
